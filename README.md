# raspi-heater

![alt tag](https://scontent-cdg2-1.xx.fbcdn.net/v/t1.0-9/15037162_1795078934042037_8821929497397715503_n.jpg?oh=6ca9e55bb196442d704f732736c5ad31&oe=58C21348)

This is a NodeJS based software for raspberry pi to control my heater at home. Maybe you'll find it useful for yourself.

## Features

- Time and location based temperature: at home, away, or away for holidays
- Interrupt the automatic setup for 15 minutes heating
- control via iOS 10 HomeKit
- Display the current status on a connected LCD display

## How it works
Right now the software just activates a relay when the temperature gets too low. In theory it should be possible to extend it in order to support digital thermostats.

## Requirements
- RaspberryPi or similar
- relay module (I used the Foxnovo 2-channel relay)
- temperature sensor (I used a DS18B20 sensor)
- some wiring
- NodeJS 6 (tested with 6.9.x)
- MongoDB (tested with 3.4.x)
- optional:
-- 1602 LCD display module

## Setup
- setup your RaspberryPi (or something similar) like in the matching guidelines
- connect your relay to GND and a GPIO port
- connect and setup your temerature sensor according to it's manual
- install NodeJS like this:
    ```shell
    $ wget http://node-arm.herokuapp.com/node_latest_armhf.deb 
    $ sudo dpkg -i node_latest_armhf.deb
    ```
- `node -v` should now return something like this:
    ```shell
    $ node -v
    v6.9.1
    ```
- checkout this repository, probably in `~/raspi-heater/` or `/etc/raspi-heater/`
- run `npm install` in that directory
- create environment config file: 
    - create new file `.env`
    - add the mongodb location like `MONGODB='localhost/heater'`
    - you can use both a local mongodb and a server based, although i noticed that the latency is likely too high to support a proper control
- Adjust `config.json` to your needs: 
    - Change the GPIO ports to your ones and your sensor name
    - Change the desired days, times and temperatures - if no temerature is set for a status, the default temperatures will be used
    - Change the locale
    - If you want to use multiple raspi-heaters:
    -- use the same central database
    -- give each one a different zone id
    -- deactivate the home- and holiday status accessories on every instance exept the main one
- start the processes you need:
    - `bin/control.js` for the general controller
    - `bin/homekit.js` for homekit support
    - `bin/display.js` if you've connected a display
    - you can start all three with the pm2 process manager with the added process.json

## Future features (maybe)
- browser interface
    - server based, with own database and replication
- real support for multiple instances in the same home network
