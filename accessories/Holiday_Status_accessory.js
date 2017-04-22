var HAP = require('hap-nodejs');
var cfg = require('../config.json');

var Accessory = HAP.Accessory;
var Service = HAP.Service;
var Characteristic = HAP.Characteristic;
var uuid = HAP.uuid;
var err = null; // in case there were any problems

var Status = require('../models/status.js');

var accessory = exports.accessory = new Accessory('Holiday Status', uuid.generate('hap-nodejs:accessories:Outlet'));

accessory.username = "1A:2B:3C:4D:5D:FA";
accessory.pincode = "031-45-154";
accessory.category = Accessory.Categories.FAN;

// set the accessory information to some ultra fancy values
accessory
    .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, "Julian Kern")
    .setCharacteristic(Characteristic.Model, "Heater1")
    .setCharacteristic(Characteristic.SerialNumber, "A000000002");

// add service for setting the status
accessory
    .addService(Service.Outlet, "Holiday Status")
    .getCharacteristic(Characteristic.On)
    .on('set', function(value, callback) {
        // update db if the status is changed
        Status.findOneAndUpdate({ key: 'isHoliday' }, { value: !!value }, { new: true, upsert: true })
        .exec((err, updated) => {
            callback(); 
        })
    });

// add service for getting the value
accessory
    .getService(Service.Outlet)
    .getCharacteristic(Characteristic.On)
    .on('get', function(callback) {
        // just a simple output from the db
        Status.findOne({ key: 'isHoliday' })
        .exec((err, data) => {
            callback(err, (data ? data.value === 'true' : false));
        })
    }); 

// yep, this "outlet" is always in use. no idea why this is a requirement
accessory
    .getService(Service.Outlet)
    .setCharacteristic(Characteristic.OutletInUse, true);
