var _ = require('lodash');
var cfg = require('../config.json');
var Lcd;

// LCD-Mock
if (process.platform === 'win32' || process.platform === 'darwin') {
    // fake LCD for test devices
    Lcd = function() {
        this.line = 0;
        
        return this;
    };

    Lcd.prototype.print = function(str) {
        console.log('LCD DEBUG - Line ' + this.line + ': ', str);
    };

    Lcd.prototype.on = function(str, callback) {
        if (str === 'ready') {
            callback();
        }
    };

    Lcd.prototype.once = function(str, callback) {
        if (str === 'printed') {
            callback();
        }
    };

    Lcd.prototype.close = function() {};
    Lcd.prototype.clear = function() { console.log('LCD DEBUG: #### Display cleared ####'); };
    Lcd.prototype.setCursor = function(x, y) {
        this.line = y;
    };
} else {
    Lcd = require('lcd');
}

var lcd = new Lcd(_.extend({cols: 8, rows: 2}, cfg.hardware.lcd));

module.exports = {
    printLines: function(array) {
        return new Promise(function(resolve, reject) {
            lcd.setCursor(0,0);
            lcd.print(array[0]);
            lcd.once('printed', function() {
                lcd.setCursor(0,1);
                lcd.print(array[1]);
                lcd.once('printed', function() { 
                    resolve();
                });
            });
        });
    }
}