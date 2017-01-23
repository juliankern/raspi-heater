var _ = require('lodash');

var app = require('../controller/app.js');
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
        app.log('LCD DEBUG - Line ' + this.line + ': ', str);
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

    Lcd.prototype.close = function() { app.log('LCD closed!'); };
    Lcd.prototype.clear = function(cb) { app.log('LCD DEBUG: #### Display cleared ####'); cb(); };
    Lcd.prototype.setCursor = function(x, y) {
        this.line = y;
    };
} else {
    Lcd = require('lcd');
}

var lcd = new Lcd(_.extend({cols: 8, rows: 2}, cfg.hardware.lcd));

module.exports = Object.assign(lcd, {
    printLines: function(array) {
        return new Promise((resolve, reject) => {
            lcd.setCursor(0,0);
            lcd.print(array[0], (err) => {
                if (err) {
                    throw err;
                }
                
                app.log('LCD printed first line');
                lcd.setCursor(0,1);
                lcd.print(array[1], (err) => {
                    if (err) {
                        throw err;
                    }
                    
                    app.log('LCD printed second line');
                    resolve();
                });
            });
        });
    }
});