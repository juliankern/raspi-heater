var gpio = require('./gpio_wrapper');

var app = require('../controller/app.js');
var cfg = require('../config.json');


module.exports = {
    on: function() {
        app.log('HARDWARE turned heater on');
        gpio.setFalse(cfg.hardware.relay); 
    },
    off: function() {
        app.log('HARDWARE turned heater off');
        gpio.setTrue(cfg.hardware.relay); 
    },
    get: function() {
        return gpio.get(cfg.hardware.relay).then((status) => {
            return !!status;
        });
    }
}