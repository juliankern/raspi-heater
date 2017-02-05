var cfg = require('../config.json');
var mongoose = require('mongoose');
var moment = require('moment');

var gpio = require('../lib/gpio_wrapper');

var heater = require('../controller/heater.js');
var app = require('../controller/app.js');

var Status = require('../models/status.js');

var displayTimeout;

require('dotenv').load();
moment.locale(cfg.locale);

// set the mongoose promise library to the nodejs one, required by mongoose now
mongoose.Promise = global.Promise;
// connect to the mongodb
mongoose.connect(process.env.MONGODB);
// output an error if the connection fails - kill the app
mongoose.connection.on('error', function() {
    console.error('ERROR - MongoDB Connection Error. Please make sure that MongoDB is running.');
    process.exit(1);
});

////////////////
// setup pins //
////////////////

//relay
gpio.setup(cfg.hardware.relay, 'out').then((data) => { 
    app.log('SETUP Pin relay!', data); 
    gpio.setTrue(cfg.hardware.relay);
});
// backlight
gpio.setup(cfg.hardware.display, 'out').then((data) => { 
    app.log('SETUP Pin display!', data); 
    gpio.setFalse(cfg.hardware.display);
});

// button
gpio.setup(cfg.hardware.button, 'in').then((data) => { 
    app.log('SETUP Pin button!', data); 
    gpio.gpio.on('change', function(channel, value) {
        if (channel === cfg.hardware.button && value) {
            if (displayTimeout) clearTimeout(displayTimeout);
            gpio.setTrue(cfg.hardware.display).then(function() {
                displayTimeout = setTimeout(function() {
                    gpio.setFalse(cfg.hardware.display);
                }, 10000);
            });
        }
    });
});

////////////////////////////////////
// start loops and call them once //
////////////////////////////////////

// first check after launch
Status.findOneAndUpdate({ key: 'heatingMode' }, { value: 'auto' }, { new: true, upsert: true }).exec((err, data) => {
    checkTemperatures();
    _set();
});

// interval checks
setInterval(checkTemperatures, 1000 * 30); // every 30s
setInterval(_set, 1000 * 60); // every 1min
setInterval(heater.checkHeaterStatus, 1000 * 60); // every 1min

/////////////
// on kill //
/////////////

// reset all the pins, turn off the heater
process.on('exit', (code) => {
    gpio.setFalse(cfg.hardware.display);
    gpio.setTrue(cfg.hardware.relay); 
});

/////////////
// Methods //
/////////////

/**
 * call for setting the current target temperature
 */
function _set() {
    app.updateTargetTemperature(function(err, temp) {
        app.log('CONTROL updated temp', err, { number: temp.number, current: temp.currentTemperature, target: temp.targetTemperature });
    })
}

/**
 * read the temperature from the sensor and save it - compare to target temperature and activate heater if necessary    
 */
function checkTemperatures() {
    app.getCurrentTemperature((temp) => {
        app.updateCurrentTemperature(temp, (err, updated) => {
            var targetTemperature = updated && updated.targetTemperature ? updated.targetTemperature : cfg.defaults.away;
            var newStatus = app.roundTemperature(temp) < app.roundTemperature(targetTemperature);
            app.log('CONTROL read & updated temp - current:', temp, ' (rounded:', app.roundTemperature(temp), ') => target:', app.roundTemperature(targetTemperature));

            heater.toggle(newStatus);
        });
    });
}





