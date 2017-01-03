var sensors;
var cfg = require('../config.json');

if (process.platform === 'win32' || process.platform === 'darwin') {
    // fake sensor for test devices
    sensors = {
        readDevice: function(sensor) {
            return new Promise((resolve, reject) => {
               console.log('FAKE sensor read!', sensor);
               resolve({ value: randomIntFromInterval(12, 25) }); 
            });
        }
    }
} else {
    sensors = require('ds1820-temp');
}

function randomIntFromInterval(min,max) {
    return Math.floor(Math.random()*(max-min+1)+min);
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