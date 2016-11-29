var status, lines;
var mongoose = require('mongoose');
var _ = require('lodash');

var lcd = require('./lib/lcd.js');

var Status = require('./models/status.js');
var Zone = require('./models/zone.js');

require('dotenv').load();
var cfg = require('./config.json');

// connect to the mongodb
mongoose.connect(process.env.MONGODB);
// output an error if the connection fails - kill the app
mongoose.connection.on('error', function() {
    console.error('ERROR - MongoDB Connection Error. Please make sure that MongoDB is running.');
    process.exit(1);
});

// update display every 30s now
setInterval(function() {
    status = 'away';
    lines = [];

    // get the current statuses
    Status.find({}).exec((err, statuses) => {
        if (err) { console.error(err); cb(err); } 
        else {
            // get statuses by key
            statuses = _.keyBy(statuses, 'key');
            
            // chceck statuses by importance
            if (statuses.isHoliday && statuses.isHoliday.value === 'true') {
                status = 'holi';
            }

            // obviously the home-status if more important than the holiday status
            if (statuses.isHome && statuses.isHome.value === 'true') {
                status = 'home';
            }

            // get current temperatures for display
            Zone.findOne({ number: cfg.zone }).exec((err, zone) => {
                // set the first line
                lines.push(
                    zone.currentTemperature.toFixed(1) +
                    'C > ' +
                    zone.targetTemperature.toFixed(1) + 'C  ' + (statuses.heaterOn.value === 'true' ? '#': '')
                );
                
                lines.push(status);
                
                // print those lines to the display
                lcd.printLines(lines);
                
                // debug output
                console.log('print lines:', lines);
            });
        }
    });
}, 1000 * 30);
