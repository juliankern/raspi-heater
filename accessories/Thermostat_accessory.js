var HAP = require('hap-nodejs');
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

thermostat
    .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, "Julian Kern")
    .setCharacteristic(Characteristic.Model, "Heater1")
    .setCharacteristic(Characteristic.SerialNumber, "A000000004");

thermostat
    .addService(Service.Thermostat, 'Thermostat')
    .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    .on('get', function(callback) {
        Status.findOne({ key: 'heaterOn' }).exec((err, data) => {
            // return our current value
            var state;
            
            switch(data.value) {
                case 'false': 
                    state = Characteristic.CurrentHeatingCoolingState.OFF;
                    break;
                case 'true':
                    state = Characteristic.CurrentHeatingCoolingState.HEAT;
                    break;
                default:
                    state = Characteristic.CurrentHeatingCoolingState.OFF;                
            }
            
            callback(null, state);
        });
    });

thermostat
    .getService(Service.Thermostat)
    .getCharacteristic(Characteristic.TargetHeatingCoolingState)
    .on('get', function(callback) {
        Status.findOne({ key: 'heatingMode' }).exec((err, data) => {
            var state;
            data = data || { value : 0 };
            
            switch(data.value) {
                case '0': 
                    state = Characteristic.TargetHeatingCoolingState.OFF;
                    break;
                case '1':
                    state = Characteristic.TargetHeatingCoolingState.HEAT;
                    break;
                default:
                    state = Characteristic.TargetHeatingCoolingState.AUTO;                
            }
            
            callback(null, state);
        })
    });

thermostat
    .getService(Service.Thermostat)
    .getCharacteristic(Characteristic.TargetHeatingCoolingState)
    .on('set', function(value, callback) {
        if (value === 2 || value === '2') value === 3;
        Status.findOneAndUpdate({ key: 'heatingMode' }, { value: value }, { new: true, upsert: true }).exec((err, data) => {
            setTimeout(function() {
                thermostat
                .getService(Service.Thermostat)
                .setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.OFF);
            }, 1000 * 60 * 15)
            
            callback();
        })
    });

setInterval(function() {
    Zone.findOne({ number: cfg.zone }).exec((err, data) => {
        thermostat
            .getService(Service.Thermostat)
            .setCharacteristic(Characteristic.CurrentTemperature, data.currentTemperature);
    });
}, 1000*60);

thermostat
    .getService(Service.Thermostat)
    .getCharacteristic(Characteristic.CurrentTemperature)
    .on('get', function(callback) {
        Zone.findOne({ number: cfg.zone }).exec((err, data) => {
            // return our current value
            callback(null, data.currentTemperature);
        });
    });

thermostat
    .getService(Service.Thermostat)
    .getCharacteristic(Characteristic.TargetTemperature)
    .on('get', function(callback) {
        Zone.findOne({ number: cfg.zone }).exec((err, data) => {
            // return our current value
            callback(null, data.targetTemperature);
        });
    });

thermostat
    .getService(Service.Thermostat)
    .getCharacteristic(Characteristic.TargetTemperature)
    .on('set', function(value, callback) {
        Zone.findOneAndUpdate({ number: cfg.zone }, { targetTemperature: value }).exec((err, data) => {
            // return our current value
            console.log('get: TargetTemperature', data.targetTemperature);
            Status.findOneAndUpdate({ key: 'heatingMode' }, { value: 1 }, { new: true, upsert: true }).exec((err, data) => {
                thermostat
                .getService(Service.Thermostat)
                .setCharacteristic(Characteristic.TargetHeatingCoolingState, Characteristic.TargetHeatingCoolingState.HEAT);

                callback();
            })
        });
    });

thermostat
    .getService(Service.Thermostat)
    .getCharacteristic(Characteristic.TemperatureDisplayUnits)
    .on('get', function(callback) {
        callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
    });

thermostat
    .getService(Service.Thermostat)
    .getCharacteristic(Characteristic.TemperatureDisplayUnits)
    .on('set', function(callback) {
        callback();
    });