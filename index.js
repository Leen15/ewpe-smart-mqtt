const mqtt = require('mqtt');
const logger = require('winston');
const express = require('express');
const asyncHandler = require('express-async-handler')
const DeviceManager = require('./app/device_manager');

const networkAddress = process.env.NETWORK || '192.168.1.255';
const mqttServerAddress = process.env.MQTT_SERVER || 'mqtt://127.0.0.1';
const mqttBaseTopic = process.env.MQTT_BASE_TOPIC || 'ewpe';
const pollInterval = process.env.DEVICE_POLL_INTERVAL || 5000;

const myFormat = logger.format.printf(info => {
    return `${info.timestamp} [${info.level}]: ${JSON.stringify(info.message)}`;
})

logger.configure({
    level: process.env.LOG_LEVEL || 'info',
    format: logger.format.combine(
        logger.format.timestamp(),
        logger.format.colorize(),
        logger.format.json(),
        myFormat
    ),
    transports: [
        new logger.transports.Console()
    ]
});


logger.info(`Starting MQTT Bridge for EWPE Smart powered air conditioners...`);


const mqttClient = mqtt.connect(mqttServerAddress);
const deviceManager = new DeviceManager(networkAddress, pollInterval);

let DevicesStatus = { };


mqttClient.on('connect', () => {
    logger.info(`Connected to MQTT Broker.`);
    const deviceRegex = new RegExp(`^${mqttBaseTopic}\/([0-9a-h]{12})\/(.*)$`, 'i');

    const getDeviceStatus = async (deviceId) => {
        const deviceStatus = await deviceManager.getDeviceStatus(deviceId);
        DevicesStatus[deviceId] = deviceStatus;
        mqttClient.publish(`${mqttBaseTopic}/${deviceId}/status`, JSON.stringify(deviceStatus));
    }

    mqttClient.publish(`${mqttBaseTopic}/bridge/state`, 'online');
    mqttClient.subscribe(`${mqttBaseTopic}/#`);

    mqttClient.on('message', async (topic, message) => {
        let matches;

        logger.info(`MQTT message received: ${topic} ${message}`);

        if (topic === `${mqttBaseTopic}/devices/list`) {
            mqttClient.publish(`${mqttBaseTopic}/devices`, JSON.stringify(deviceManager.getDevices()))
        } else {
            matches = deviceRegex.exec(topic);

            if (matches !== null) {
                const [, deviceId, command] = matches;

                if (command === 'get') {
                    getDeviceStatus(deviceId);
                }

                if (command === 'set') {
                    const cmdResult = await deviceManager.setDeviceState(deviceId, JSON.parse(message));
                    mqttClient.publish(`${mqttBaseTopic}/${deviceId}/status`, JSON.stringify(cmdResult));
                }
            }
        }
    });

    deviceManager.on('device_bound', (deviceId, device) => {
        mqttClient.publish(`${mqttBaseTopic}/${deviceId}`, JSON.stringify(device));
        if (pollInterval > 0) {
            setInterval(() => getDeviceStatus(deviceId), pollInterval);
        }
    });
});


// Constants
const PORT = 888;
const HOST = '0.0.0.0';

// App
const app = express();
app.get('/', (req, res) => {
  res.send('MQTT Bridge for EWPE Smart powered air conditioners\n');
});

app.get('/devices', (req, res) => {
  res.send(JSON.stringify(deviceManager.getDevices()));
});

app.get('/status', (req, res) => {
  res.send(JSON.stringify(DevicesStatus));
});

app.get('/status/:id', (req, res) => {
  if (DevicesStatus.hasOwnProperty(req.params.id )) {
    res.send(JSON.stringify(DevicesStatus[req.params.id]));
  }
  else {
    const result = { error: "This device doesn't exist" }
    res.send(JSON.stringify(result));
  }
});

app.get('/set/:id', asyncHandler(async (req, res, next) => {
  if (DevicesStatus.hasOwnProperty(req.params.id )) {
    const cmdResult = await deviceManager.setDeviceState(req.params.id, JSON.parse(req.query.json));
    res.send(JSON.stringify(cmdResult));
  }
  else {
    const result = { error: "This device doesn't exist" }
    res.send(JSON.stringify(result));
  }
}));

app.listen(PORT, HOST);
logger.info(`HTTP Server running on http://${HOST}:${PORT}`);
