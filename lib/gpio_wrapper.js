var gpio;
var _ = require('lodash');

if (process.platform === 'win32' || process.platform === 'darwin') {
    // fake device for test systems
    gpio = {
        pins: [],
        setup: function(pin, direction, callback) {
            this.pins.push({ id: pin, direction: direction, value: 0 });

            if(callback) callback();
        },
        write: function(pin, value, callback) {
            _.forEach(this.pins, function(n) {
                if (n.id === pin) {
                    n.value = value;

                    if(callback) callback();
                }
            });
        },
        read: function(pin, callback) {
            callback(null,  
                _.result(_.find(this.pins, function(n) {
                    return n.id === pin;
                }), 'value')
            );
        },
        on: function() {}
    };
} else {
    gpio = require('rpi-gpio');
}

module.exports = (function(){
    return {
        errorHandler,
        setup,
        get,
        set,
        setTrue,
        setFalse
    }
    
    function errorHandler(err) {
        console.log('GPIO ERROR!', err); 
    } 
    
    function setup(pin, direction) {
        var dir = direction === 'in' ? gpio.DIR_IN : gpio.DIR_OUT;

        var promise = new Promise(function(resolve, reject) {
            if (direction === 'in') {
                gpio.setup(pin, dir, gpio.EDGE_BOTH, function(err) {
                    if (err) {
                        errorHandler(err);
                        reject(Error(err));
                    }
                    
                    resolve({ pin: pin, direction: direction });    
                });
            } else {
                gpio.setup(pin, dir, function(err) {
                    if (err) { reject(Error(err)); }

                    resolve({ pin: pin, direction: direction });
                });
            }
        });

        return promise.catch(errorHandler);
    }
    
    function set(pin, value) {
        var promise = new Promise(function(resolve, reject) {
            gpio.write(pin, value, function(err) {
                if (err) { reject(Error(err)); }

                resolve({ pin: pin, value: value });
            });
        });

        return promise.catch(errorHandler);
    }
    
    function get(pin) {
        var promise = new Promise(function(resolve, reject) {
            gpio.read(pin, function(err, value) {
                if (err) { reject(Error(err)); }

                resolve({ pin: pin, value: value });
            });
        });

        return promise.catch(errorHandler);
    }
    
    function setTrue(pin) {
        return set(pin, true).catch(errorHandler);
    }

    function setFalse(pin) {
        return set(pin, false).catch(errorHandler);
    }
})();

module.exports.gpio = gpio;