var gpio = require('./gpio_wrapper');

var app = require('../controller/app.js');
var cfg = require('../config.json');

function on() {
    app.log('HARDWARE turned heater on');
    gpio.setFalse(cfg.hardware.relay); 
}

function off() {
    app.log('HARDWARE turned heater off');
    gpio.setTrue(cfg.hardware.relay); 
}

function get() {
    return gpio.get(cfg.hardware.relay).then((status) => {
        return !!status;
    });
}

function set(state) {
    if (state) {
        on();
    } else {
        off();
    }
}

module.exports = {
    on: on,
    off: off,
    get: get,
    set: set
}