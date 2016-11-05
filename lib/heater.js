var gpio = require('./gpio_wrapper');
var cfg = require('../config.json');


module.exports = {
    on: function() {
        console.log('turned heater on');
        gpio.setFalse(cfg.hardware.relay); 
    },
    off: function() {
        console.log('turned heater off');
        gpio.setTrue(cfg.hardware.relay); 
    },
    get: function() {
        return gpio.get(cfg.hardware.relay).then((status) => {
            return !!status;
        });
    }
}