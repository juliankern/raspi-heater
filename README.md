# raspi-heater

This is a NodeJS based software for raspberry pi to control my heater at home. Maybe you'll find it useful for yourself.

## Features

- Time and location based temperature: at home, away, or away for holidays
- Interrupt the automatic setup for 15 minutes heating
- control via iOS 10 HomeKit
- Display the current status on a connected LCD display

## How it works
Right now the software just activates a relay when the temperature gets too low. In theory it should be possible to extend it in order to support digital thermostats.

## Requirements
- NodeJS 6
- MongoDB

## Setup
- checkout this repository
- run `npm install`
- create environment config file: 
    - create new file `.env`
    - add the mongodb location like `MONGODB='localhost/heater'`
    - you can use both a local mongodb and a server based, although i noticed that the latency is likely too high to support a proper control
- Adjust `config.json` to your needs: 
    - Change the GPIO ports to your ones and your sensor name
    - Change the desired days, times and temperatures - if no temerature is set for a status, the default temperatures will be used
    - Change the locale
    - If you want to use multiple raspi-heaters with the same database, give each one a different zone id
- start the processes you need:
    - `control.js` for the general controller
    - `homekit.js` for homekit support
    - `display.js` if you've connected a display
    - you can start all three with the pm2 process manager with the added process.json

## Future features
- browser interface
    - server based, with own database and replication
- real support for multiple instances in the same home network