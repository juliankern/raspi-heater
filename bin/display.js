var status, lines;
var mongoose = require('mongoose');
var moment = require('moment');
var _ = require('lodash');

var lcd;
var app = require('../controller/app.js');

var Status = require('../models/status.js');
var Zone = require('../models/zone.js');

require('dotenv').load();
var cfg = require('../config.json');

// set the mongoose promise library to the nodejs one, required by mongoose now
mongoose.Promise = global.Promise;
// connect to the mongodb
mongoose.connect(process.env.MONGODB);
// output an error if the connection fails - kill the app
mongoose.connection.on('error', () => {
    console.error('ERROR - MongoDB Connection Error. Please make sure that MongoDB is running.');
    process.exit(1);
});

// call start display
reopenDisplay();
updateDisplay();
// update display every 10s now
setInterval(reopenDisplay, 1000 * 60)
setInterval(updateDisplay, 1000 * 10);

function reopenDisplay() {
    if(lcd && lcd.close) lcd.close();
    lcd = require('../lib/lcd.js');
    
    lcd.on('ready', () => {
        app.log('LCD READY!!');
    });
}

function updateDisplay() {
    app.log('update display....');
    lines = [];

    app.log('...get the current status...');
    app.getCurrentStatus((status, data, statuses) => {
        app.log('...current status:', status);    
        app.log('...get temperatures...');

        // get current temperatures for display
        Zone.findOne({ number: cfg.zone }).exec((err, zone) => {
            app.log('...got temperatures!');
            
            // set the first line
            lines.push(
                zone.currentTemperature.toFixed(1) +
                'C > ' +
                zone.targetTemperature.toFixed(1) + 'C  ' + (statuses.heaterOn.value === 'true' ? '#': ' ')
            );
            
            // put the status in the second line, fill it up with spaces to prevent display bugs - no idea why they keep appearing
            // - looking funny though
            lines.push(_.padEnd(status, 16));
            
            // print those lines to the display
            lcd.clear((err) => {
                if (err) {
                    throw err;
                }
            
                lcd.printLines(lines).then(() => {
                    app.log('DISPLAY printed all lines');
                });
                // debug output
                app.log('print lines:', lines);
            });
        });
    })
}    