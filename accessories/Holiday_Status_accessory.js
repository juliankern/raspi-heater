var HAP = require('hap-nodejs');
var cfg = require('../config.json');

var Accessory = HAP.Accessory;
var Service = HAP.Service;
var Characteristic = HAP.Characteristic;
var uuid = HAP.uuid;
var err = null; // in case there were any problems

var Status = require('../models/status.js');

var outlet = exports.accessory = new Accessory('Holiday Status', uuid.generate('hap-nodejs:accessories:Outlet'));

outlet.username = "1A:2B:3C:4D:5D:FA";
outlet.pincode = "031-45-154";

outlet
    .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, "Julian Kern")
    .setCharacteristic(Characteristic.Model, "Heater1")
    .setCharacteristic(Characteristic.SerialNumber, "A000000002");

outlet
    .addService(Service.Outlet, "Holiday Status")
    .getCharacteristic(Characteristic.On)
    .on('set', function(value, callback) {
        Status.findOneAndUpdate({ key: 'isHoliday' }, { value: !!value }, { new: true, upsert: true })
        .exec((err, updated) => {
            callback(); 
        })
    });

outlet
    .getService(Service.Outlet)
    .getCharacteristic(Characteristic.On)
    .on('get', function(callback) {
        Status.findOne({ key: 'isHoliday' })
        .exec((err, data) => {
            callback(err, (data ? data.value === 'true' : false));
        })
    }); 

outlet
    .getService(Service.Outlet)
    .setCharacteristic(Characteristic.OutletInUse, true);
