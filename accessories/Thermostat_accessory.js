var HAP = require('hap-nodejs');
var app = require('../lib/global');
var cfg = require('../config.json');

var Accessory = HAP.Accessory;
var Service = HAP.Service;
var Characteristic = HAP.Characteristic;
var uuid = HAP.uuid;

var Zone = require('../models/zone.js');
var Status = require('../models/status.js');

var thermostat = exports.accessory = new Accessory('Thermostat', uuid.generate('hap-nodejs:accessories:thermostat'));

thermostat.username = "C1:5D:3A:AE:5E:F3";
thermostat.pincode = "031-45-154";

// set the accessory information to some ultra fancy values
thermostat
    .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, "Julian Kern")
    .setCharacteristic(Characteristic.Model, "Heater1")
    .setCharacteristic(Characteristic.SerialNumber, "A000000004");

thermostat
    .on('identify', (paired, callback) => {
        app.log('Identifying Thermostat - paired:', paired);
        callback();
    }); 
    
// add a service for getting the current heating state 
thermostat
    .addService(Service.Thermostat, 'Thermostat')
    .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    .on('get', function(callback) {
        Status.findOne({ key: 'heaterOn' }).exec((err, data) => {
            // return our current value
            var state, stateName;
            
            // maybe i should find a more suitable solution here, but it works for now - it actually shows in homekit if the heater is turned on now
            // - which isn't that bad, right?
            switch(data.value) {
                case 'false': 
                    stateName = 'off';
                    state = Characteristic.CurrentHeatingCoolingState.OFF;
                    break;
                case 'true':
                    stateName = 'heat';
                    state = Characteristic.CurrentHeatingCoolingState.HEAT;
                    break;
                default:
                    stateName = 'off';
                    state = Characteristic.CurrentHeatingCoolingState.OFF;                
            }
            
            app.log('get: CurrentHeatingCoolingState', stateName, data.value);
            callback(null, state);
        });
    });

// add a service forgetting the supposed heating state
thermostat
    .getService(Service.Thermostat)
    .getCharacteristic(Characteristic.TargetHeatingCoolingState)
    .on('get', function(callback) {
        Status.findOne({ key: 'heatingMode' }).exec((err, data) => {
            var state, stateName;
            data = data || { value : 0 };
            
            // same as above, should be changed maybe
            switch(data.value) {
                case '0': 
                    stateName = 'off';
                    state = Characteristic.TargetHeatingCoolingState.OFF;
                    break;
                case '1':
                    stateName = 'heat';
                    state = Characteristic.TargetHeatingCoolingState.HEAT;
                    break;
                default:
                    stateName = 'auto';
                    state = Characteristic.TargetHeatingCoolingState.AUTO;                
            }
            
            app.log('get: TargetHeatingCoolingState', stateName, data.value);
            callback(null, state);
        })
    });

// add a service for changing the target state
thermostat
    .getService(Service.Thermostat)
    .getCharacteristic(Characteristic.TargetHeatingCoolingState)
    .on('set', function(value, callback) {
        // ignore state "2" which would be "cooling", and set to "auto" instead
        if (value === 2 || value === '2') value === 3;
        // save the state
        Status.findOneAndUpdate({ key: 'heatingMode' }, { value: value }, { new: true, upsert: true }).exec((err, data) => {
            setTimeout(function() {
                // reset the state to off after 15 minutes again -> 15 minutes of heating
                // - the fun part is: we don't need to do more than setting it. the actual changes happens, because this one gets called again - and control.js sees the new status
                thermostat
                .getService(Service.Thermostat)
                .setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.OFF);
            }, 1000 * 60 * 60) // 1h
            
            app.log('set: TargetHeatingCoolingState', value);
            callback();
        })
    });

// check for the current temperature every 1min, and update homekit
setInterval(function() {
    Zone.findOne({ number: cfg.zone }).exec((err, data) => {
        thermostat
            .getService(Service.Thermostat)
            .setCharacteristic(Characteristic.CurrentTemperature, data.currentTemperature);
    });
}, 1000*60);

// add service for the current temperature
thermostat
    .getService(Service.Thermostat)
    .getCharacteristic(Characteristic.CurrentTemperature)
    .on('get', function(callback) {
        Zone.findOne({ number: cfg.zone }).exec((err, data) => {
            // return our current value - simple output
            app.log('get: CurrentTemperature', data.currentTemperature);
            callback(null, data.currentTemperature);
        });
    });

// add service for getting the target temperature
thermostat
    .getService(Service.Thermostat)
    .getCharacteristic(Characteristic.TargetTemperature)
    .on('get', function(callback) {
        Zone.findOne({ number: cfg.zone }).exec((err, data) => {
            // return our current value - simple output
            app.log('get: TargetTemperature', data.targetTemperature);
            callback(null, data.targetTemperature);
        });
    });

// add a service for setting the target temperature
thermostat
    .getService(Service.Thermostat)
    .getCharacteristic(Characteristic.TargetTemperature)
    .on('set', function(value, callback) {
        Zone.findOneAndUpdate({ number: cfg.zone }, { targetTemperature: value }).exec((err, data) => {
            // again some fun: this causes the timer to start again
            app.log('set: TargetTemperature', data.targetTemperature);
            Status.findOneAndUpdate({ key: 'heatingMode' }, { value: 1 }, { new: true, upsert: true }).exec((err, data) => {
                Zone.findOneAndUpdate({ number: cfg.zone }, { customTemperature: value }).exec((err, data) => {
                    // actually THIS (v) does.
                    thermostat
                    .getService(Service.Thermostat)
                    .setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.HEAT);

                    callback();
                });
            })
        });
    });

// add a "service" for getting the current units => defaults to celsius
thermostat
    .getService(Service.Thermostat)
    .getCharacteristic(Characteristic.TemperatureDisplayUnits)
    .on('get', function(callback) {
        callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
    });

// add a service for changing the unit => nope. still celsius.
thermostat
    .getService(Service.Thermostat)
    .getCharacteristic(Characteristic.TemperatureDisplayUnits)
    .on('set', function(value, callback) {
        callback();
    });  