var status, lines;
var mongoose = require('mongoose');
var _ = require('lodash');

var lcd = require('./lib/lcd.js');

var Status = require('./models/status.js');
var Zone = require('./models/zone.js');

require('dotenv').load();
var cfg = require('./config.json');

// set the mongoose promise library to the nodejs one, required by mongoose now
mongoose.Promise = global.Promise;
// connect to the mongodb
mongoose.connect(process.env.MONGODB);
// output an error if the connection fails - kill the app
mongoose.connection.on('error', () => {
    console.error('ERROR - MongoDB Connection Error. Please make sure that MongoDB is running.');
    process.exit(1);
});

lcd.on('ready', () => {
    console.log('LCD READY!!');
});

// update display every 10s now
setInterval(updateDisplay, 1000 * 10);

function updateDisplay() {
    console.log('update display....');
    status = 'away';
    lines = [];

    // get the current statuses
    Status.find({}).exec((err, statuses) => {
        console.log('...get the current status...');
        if (err) { console.error(err); cb(err); } 
        else {
            // get statuses by key
            statuses = _.keyBy(statuses, 'key');
            
            // chceck statuses by importance
            if (statuses.isHoliday && statuses.isHoliday.value === 'true') {
                status = 'holiday';
            }

            // obviously the home-status if more important than the holiday status
            if (statuses.isHome && statuses.isHome.value === 'true') {
                status = 'home';
            }
            
            console.log('...current status:', status);
            console.log('...get temperatures...');

            // get current temperatures for display
            Zone.findOne({ number: cfg.zone }).exec((err, zone) => {
                console.log('...got temperatures!');
                
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
                        console.log('DISPLAY printed all lines');
                    });
                    // debug output
                    console.log('print lines:', lines);
                });
            });
        }
    });
}    

function hex2String(input) {
    // split input into groups of two
    var hex = input.match(/[\s\S]{2}/g) || [];
    var output = '';

    // build a hex-encoded representation of your string
    for (var i = 0, j = hex.length; i < j; i++) {
        output += '%' + ('0' + hex[i]).slice(-2);
    }

    // decode it using this trick
    output = decodeURIComponent(output);

    return output;
}