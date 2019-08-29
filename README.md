# ewpe-smart-mqtt
MQTT/HTTP bridge for EWPE Smart powered devices which can be controlled via WiFi using [EWPE Smart app](https://play.google.com/store/apps/details?id=com.gree.ewpesmart)

## Prerequisites

Setup and run MQTT server ([mosquitto](https://mosquitto.org/) is the easiest one, but I prefer [EMQ](https://www.emqx.io/) )


## Installation (Docker)

```
docker run -it \
    --network="host" \
    -e "MQTT_SERVER=mqtt://127.0.0.1" \
    -e "MQTT_BASE_TOPIC=ewpe" \
    -e "NETWORK=192.168.1.255" \
    -e "DEVICE_POLL_INTERVAL=5000" \
    --name ewpe-smart-mqtt \
    leen15/ewpe-smart-mqtt:latest
```

## Installation without docker

1. Clone or download this repository
```
git clone https://github.com/Leen15/ewpe-smart-mqtt
```
2. Install dependencies
```
npm install
```
3. Make initial configuration by setting enviromental variables

| Variable | Description | Default value |
| --- | --- | --- |
| MQTT_SERVER |MQTT server URI|mqtt://127.0.0.1|
| MQTT_BASE_TOPIC |Base MQTT topic for bridge messages|ewpe
| NETWORK |Network adress to scan devices|192.168.1.255
| DEVICE_POLL_INTERVAL |Interval (ms) to poll device status|5000

4. Run the bridge
```
npm start
```

## Communicating with the bridge using MQTT

- Publish to `ewpe/devices/list` to receive list of registered devices
- Publish to `ewpe/{deviceId}/get` to receive status of {deviceId}
- Publish to `ewpe/{deviceId}/set` to set status of {deviceId}, payload should be json object with key/values pairs to set, i.e:
```
ewpe/{deviceId}/set {"Pow": 1, "SetTem": 24}
```

## Communicating with the bridge using REST API
This image include an HTTP Server that allows to communicate with MQTT bridge using REST api.
Due to mandatory use of `--network=host`, this image expose _on the host_ the port `888`, and you cannot change it without change the Dockerfile.
NB: Only Docker for Linux support exposing ports with --network=host. So you cannot use this image with your macOS.

*Available Endpoints:*
--------------------
**/devices**  
Return the list of available devices

**/status**  
Return the status of all available devices

**/status/:id**  
Return the status of a single device by ID

**/set/:id?json=**  
Set a list of settings for a single device.  
You have to pass a json in params, like this:   
`/set/:id?json={"Pow": 1, "SetTem": 24}`  
You can set all properties that you see with status EP.

## Supported devices
All devices which can be controlled via EWPE Smart app should be supported, including:

- Gree Smart series
- Cooper&Hunter: Supreme, Vip Inverter, ICY II, Arctic, Alpha, Alpha NG, Veritas, Veritas NG series
- EcoAir X series
- Viessmann series

## Credits
This project became possible thanks to great work of reverse engineering the original app protocol in [gree-remote](https://github.com/tomikaa87/gree-remote) project and to the work for mqtt part by [stas-demydiuk](https://github.com/stas-demydiuk/ewpe-smart-mqtt)
