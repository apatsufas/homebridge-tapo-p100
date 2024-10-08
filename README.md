
<p align="center">

<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

# Homebridge Tapo Platform Plugin

This is a Homebridge platform plugin for the TP-Link Tapo P100, P105, P110 Plugs and L510E, L530E Lightbulbs.

Following features are supported per Device:

- P100 : Turn On, Turn Off, Current State.
- P110 : Same as P100 + Power Consumption in Eve App.
- L510E: Same as P100 + Brightness control
- L530E: Same as L510E + Hue and Saturation control, Adaptive Lighting support and Power Consumption in Eve App.

Tested with:

- Tapo P100 (EU, UK)
- Tapo L510E
- Tapo L530E

## Installation

1. Install homebridge
2. Install this plugin using: `npm install -g homebridge-tapo` or through Homebridge UI
3. Update your Homebridge configuration file (`config.json`)

## Configuration

The available fields in the config.json file are:

- `platform` [required] Always "TapoP100"
- `name` [required] Descriptive name of the platform
- `username` [required] The username with which you registered/login in the Tapo app.
- `password`: [required] The password with which you registered/login in the Tapo app
- `devices`: [required] An array of devices
  - `name`: [required] The name of each device
  - `host`: [required] The host (local IP address) of each device
  - `type`: [optional] Plug, PowerPlug, Light or Colorlight. Use Plug for P100 or P105, PowerPlug for P110, Light for L510E and Colorlight for L530. If not provided, default is Plug.
  - `updateInterval`: [optional] seconds. Set the update interval for the plugin. Determines how often the plugin will request the state from the Tapo Device.
  - `timeout`: [optional] seconds. Sets the request timeout header for the requests to the Tapo Device.

Example:

```json
"platforms": [
    {
        "name": "Tapo Smart Platform",
        "username": "the username from the Tapo app",
        "password": "the password from the Tapo app",
        "platform": "TapoP100",
        "devices": [
            {
                "name": "Kitchen",
                "host": "192.168.1.21",
                "type": "Plug",
                "updateInterval": 10,
                "timeout": 2
            }
        ]
    }
]
```

## How does it work?

The plugin polls this outlet endpoint:

```text
http://[host]/app?token
```

Example response from this endpoint:

```json
{
"device_id":"",
"fw_ver":"1.2.1 Build 20200616 Rel. 31218",
"hw_ver":"1.20.0",
"model":"P100",
"type":"SMART.TAPOPLUG",
"mac":"",
"hw_id":"",
"fw_id":"",
"oem_id":"",
"specs":"EU",
"device_on":false,
"on_time":0,
"overheated":false,
"nickname":"",
"location":"kitchen",
"avatar":"ceiling_lamp",
"time_usage_today":515,
"time_usage_past7":3102,
"time_usage_past30":3102,
"longitude":,
"latitude":,
"has_set_location_info":false,
"ip":"",
"ssid":"",
"signal_level":2,
"rssi":-61,
"region":"Europe/Athens",
"time_diff":120,
"lang":"en_US"}
```

## Information

This plugin will also allow you to control the Tapo Plugs and Lights even if you have blocked the internet connectivity of the device.

I created the plugin for personal use and wanted to share it with other people too.

Maybe you would consider buying me a [coffee](https://www.paypal.me/AZimnas)

### Thanks / Credits

Ported from the Python library https://github.com/fishbigger/TapoP100 (by @fishbigger) to Nodejs.
