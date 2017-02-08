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
-- `forever` a node deamonizer, OR:
-- `pm2` and avanced process manager, which consumes quite a lot of ressouces (wasn't able to run it on a raspberry 1, you should use `forever` instead
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
- optionally install `pm2` or `forever` like this:
    ```shell
    $ sudo npm install pm2 -g
    $ sudo npm install forever -g
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
- if you want to start the processes via a custom `/etc/init.d`-Script, you probably want to install `raspi-heater` into a public location like `/etc/raspi-heater` instead of one users home folder
    - then you can add the processes to your custom `/etc/init.d`-script (assuming you want to use `forever`):
        ```shell
        cd /etc/raspi-heater && sudo forever bin/control.js
        cd /etc/raspi-heater && sudo forever bin/homekit.js
        cd /etc/raspi-heater && sudo forever bin/display.js
        ```
    - if you want to use `pm2` you can simply add:
        ```shell
        cd /etc/raspi-heater && sudo pm2 start process.json
        ```
- to check the current status:
    ```shell
    $ node bin/status.js
    ########################
    #### raspi-heater Status
    ########################
    heaterOn        true   since 8 minutes
    targetHeaterOn  false  since a few seconds
    cooldownOn      false  since 25 minutes
    heatingMode     auto   changed 8 minutes ago
    ######################
    isHome     true
    isHoliday  false
    ######################
    current temerature:  19.9
    target temerature:   20.0
    ######################
    ```

## Future features (maybe)
- browser interface
    - server based, with own database and replication
- real support for multiple instances in the same home network
