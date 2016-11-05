var cfg = require('./config.json');
var _ = require('lodash');
var mongoose = require('mongoose');
var moment = require('moment');

var gpio = require('./lib/gpio_wrapper');

var sensor = require('./lib/sensor.js');
var heater = require('./controller/heater.js');

var Zone = require('./models/zone.js');
var Status = require('./models/status.js');

var displayTimeout;

require('dotenv').load();
moment.locale(cfg.locale);

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB);
mongoose.connection.on('error', function() {
    console.error('ERROR - MongoDB Connection Error. Please make sure that MongoDB is running.');
    process.exit(1);
});

////////////////
// setup pins //
////////////////

//relay
gpio.setup(cfg.hardware.relay, 'out');
// backlight
gpio.setup(cfg.hardware.display, 'out').then((data) => { 
    console.log('Pin display setup!', data); 
    gpio.setFalse(cfg.hardware.display);
});

// button
gpio.setup(cfg.hardware.button, 'in').then((data) => { 
    console.log('Pin button setup!', data); 
    gpio.gpio.on('change', function(channel, value) {
        if (channel === cfg.hardware.button && value) {
            if (displayTimeout) clearTimeout(displayTimeout);
            gpio.setTrue(cfg.hardware.display).then(function() {
                displayTimeout = setTimeout(function() {
                    gpio.setFalse(cfg.hardware.display);
                }, 10000);
            });
        }
    });
});

////////////////////////////////////
// start loops and call them once //
////////////////////////////////////

checkTemperatures();
_set();

setInterval(checkTemperatures, 1000 * 30); // every 30s
setInterval(_set, 1000 * 60); // every 1min

/////////////
// on kill //
/////////////

process.on('exit', (code) => {
    gpio.setFalse(cfg.hardware.display);
    gpio.setTrue(cfg.hardware.relay); 
});

/////////////
// Methods //
/////////////

function _set() {
    setTargetTemperature(function(err, temp) {
        console.log('updated temp', err, temp);
    })
}

function checkTemperatures() {
    sensor.read().then((temp) => {
        Zone.findOneAndUpdate({ number: cfg.zone }, { currentTemperature: temp }, { new: true, upsert: true })
        .exec((err, updated) => {
            console.log('updated?', updated);
            var targetTemperature = updated && updated.targetTemperature ? updated.targetTemperature : cfg.defaults.away;
            var newStatus = roundTemperature(temp) < roundTemperature(targetTemperature);
            console.log('read & updated temp', temp, roundTemperature(temp), '=>', roundTemperature(targetTemperature));

            heater.toggle(newStatus);
        });
    });
}

function roundTemperature(value) {
    return Math.ceil(value * 4) / 4;
}

function setTargetTemperature(cb) {
    var status = 'away';
    Status.find({}).exec((err, statuses) => {
        if (err) { console.error(err); cb(err); } 
        else {
            statuses = _.keyBy(statuses, 'key');

            if (statuses.isHoliday && statuses.isHoliday.value === 'true') {
                status = 'holiday';
            }

            if (statuses.isHome && statuses.isHome.value === 'true') {
                status = 'home';
            }
            
            var temperature = getCurrentConfig().temperatures[status];
            
            if (statuses.heatingMode && statuses.heatingMode.value === '1') {
                temperature = 88;
            }
            console.log('current config', getCurrentConfig(), status, temperature);

            Zone.findOneAndUpdate({ number: cfg.zone }, { targetTemperature: temperature }).exec(cb)
        }
    });
}

function getCurrentConfig(now) {
    now = now || moment();
    var dateArray = [];
    var foundTime;

    for (let day of cfg.days) {
        for(let time of day.times) {
            dateArray.push({ 
                day: day.day,
                dayIndex: day.index,
                time: time.time,
                datetime: getMomentForTime(moment(), time.time).day(day.index)._d, 
                temperatures: time.temperatures 
            });
        }
    }

    dateArray.push({ datetime: moment()._d, now: true });

    dateArray.sort((a, b) => {
        if (moment(a.datetime).unix() > moment(b.datetime).unix()) {
            return 1;
        }

        if (moment(a.datetime).unix() < moment(b.datetime).unix()) {
            return -1;
        }

        return 0;
    });

    var foundIndex = dateArray.findIndex((e) => {
        return !!e.now;
    });

    foundIndex = foundIndex === 0 ? dateArray.length : foundIndex;
    foundTime = dateArray[foundIndex - 1];

    return { 
        day: moment().day(foundTime.dayIndex).format('dddd'), 
        dayIndex: foundTime.dayIndex,
        time: foundTime.time, 
        temperatures: _.extend(cfg.defaults, foundTime.temperatures) 
    };
}

function getMomentForTime(now, time) {
    if (!time) return false;
    time = time.split(':');
    return moment(now).hour(time[0]).minute(time[1]);
}