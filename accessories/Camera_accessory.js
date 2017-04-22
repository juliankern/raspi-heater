var HAP = require('hap-nodejs');
var cfg = require('../config.json');

var Camera = require('../lib/camera.js').Camera;

var Accessory = HAP.Accessory;
var Service = HAP.Service;
var Characteristic = HAP.Characteristic;
var uuid = HAP.uuid;
var err = null; // in case there were any problems

var Status = require('../models/status.js');

var accessory = exports.accessory = new Accessory('Node Camera', uuid.generate("Node Camera"));

accessory.username = "EC:22:3D:D3:CE:CE";
accessory.pincode = "031-45-154";
accessory.category = Accessory.Categories.CAMERA;

var cameraSource = new Camera();

accessory
    .getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, "Julian Kern")
    .setCharacteristic(Characteristic.Model, "Heater1")
    .setCharacteristic(Characteristic.SerialNumber, "A000000006");

accessory.configureCameraSource(cameraSource);

accessory.on('identify', function(paired, callback) {
  console.log("Node Camera identify");
  callback(); // success
});
