var status, lines;
var mongoose = require('mongoose');
var _ = require('lodash');

var lcd = require('./lib/lcd.js');

var Status = require('./models/status.js');
var Zone = require('./models/zone.js');

require('dotenv').load();
var cfg = require('./config.json');

mongoose.connect(process.env.MONGODB);
mongoose.connection.on('error', function() {
    console.error('ERROR - MongoDB Connection Error. Please make sure that MongoDB is running.');
    process.exit(1);
});

setInterval(function() {
    status = 'away';
    lines = [];

    Status.find({}).exec((err, statuses) => {
        if (err) { console.error(err); cb(err); } 
        else {
            statuses = _.keyBy(statuses, 'key');
            if (statuses.isHoliday && statuses.isHoliday.value === 'true') {
                status = 'holi';
            }

            if (statuses.isHome && statuses.isHome.value === 'true') {
                status = 'home';
            }

            Zone.findOne({ number: cfg.zone }).exec((err, zone) => {
                lines.push(
                    zone.currentTemperature.toFixed(1) +
                    'C > ' +
                    zone.targetTemperature.toFixed(1) + 'C  ' + (statuses.heaterOn.value === 'true' ? '#': '')
                );
                
                lines.push(status);
                
                lcd.printLines(lines);
                console.log('print lines:', lines);
            });
        }
    });
}, 1000 * 30);
