var sensors;
var cfg = require('../config.json');

if (process.platform === 'win32' || process.platform === 'darwin') {
    // fake sensor for test devices
    sensors = {
        readDevice: function(sensor) {
            return new Promise((resolve, reject) => {
               console.log('sensor read!', sensor);
               resolve({ value: 99 }); 
            });
        }
    }
} else {
    sensors = require('ds1820-temp');
}


module.exports = {
    read: function readTemperature() {
        return sensors.readDevice(cfg.hardware.sensor).then(function(data) {
            return data.value;
        }, function(err) {
            console.log('SENSOR ERROR: ', err);
        })
    }
}