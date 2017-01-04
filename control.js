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

// set the mongoose promise library to the nodejs one, required by mongoose now
mongoose.Promise = global.Promise;
// connect to the mongodb
mongoose.connect(process.env.MONGODB);
// output an error if the connection fails - kill the app
mongoose.connection.on('error', function() {
    console.error('ERROR - MongoDB Connection Error. Please make sure that MongoDB is running.');
    process.exit(1);
});

////////////////
// setup pins //
////////////////

//relay
gpio.setup(cfg.hardware.relay, 'out').then((data) => { 
    console.log('SETUP Pin relay!', data); 
    gpio.setTrue(cfg.hardware.relay);
});
// backlight
gpio.setup(cfg.hardware.display, 'out').then((data) => { 
    console.log('SETUP Pin display!', data); 
    gpio.setFalse(cfg.hardware.display);
});

// button
gpio.setup(cfg.hardware.button, 'in').then((data) => { 
    console.log('SETUP Pin button!', data); 
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

// first check after launch
Status.findOneAndUpdate({ key: 'heatingMode' }, { value: 0 }, { new: true, upsert: true }).exec((err, data) => {
    checkTemperatures();
    _set();
});

// interval checks
setInterval(checkTemperatures, 1000 * 30); // every 30s
setInterval(_set, 1000 * 60); // every 1min

/////////////
// on kill //
/////////////

// reset all the pins, turn off the heater
process.on('exit', (code) => {
    gpio.setFalse(cfg.hardware.display);
    gpio.setTrue(cfg.hardware.relay); 
});

/////////////
// Methods //
/////////////

/**
 * call for setting the current target temperature
 */
function _set() {
    setTargetTemperature(function(err, temp) {
        console.log('CONTROL updated temp', err, { number: temp.number, current: temp.currentTemperature, target: temp.targetTemperature });
    })
}

/**
 * read the temperature from the sensor and save it - compare to target temperature and activate heater if necessary    
 */
function checkTemperatures() {
    sensor.read().then((temp) => {
        Zone.findOneAndUpdate({ number: cfg.zone }, { currentTemperature: temp }, { new: true, upsert: true })
        .exec((err, updated) => {
            var targetTemperature = updated && updated.targetTemperature ? updated.targetTemperature : cfg.defaults.away;
            var newStatus = roundTemperature(temp) < roundTemperature(targetTemperature);
            console.log('CONTROL read & updated temp - current:', temp, ' (rounded:', roundTemperature(temp), ') => target:', roundTemperature(targetTemperature));

            heater.toggle(newStatus);
        });
    });
}

/**
 * helper function for rounding teperature - always to quarters
 * @param  {number} value temperature
 * @return {number}       rounded temperature
 */
function roundTemperature(value) {
    return Math.ceil(value * 4) / 4;
}

/**
 * gets the current status and sets the target temperature accordingly
 * @param {Function} cb callback after setting the target
 */
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
            
            getCurrentConfig().then((data) => {
                if (statuses.heatingMode && statuses.heatingMode.value === '1') {
                    status = 'timer';
                }
                
                var temperature = data.temperatures[status];
                
                console.log('CONTROL current config:', data);
                console.log('CONTROL current status:', status);
                console.log('CONTROL found temperature:', temperature);

                Zone.findOneAndUpdate({ number: cfg.zone }, { targetTemperature: temperature })
                    .select('number currentTemperature targetTemperature')
                    .exec(cb);
            });
        }
    });
}

/**
 * gets the current temperature set relative to current (or "now"-based-) time
 * @param  {object} now moment.js Obj for setting the current time - if undefined use real now
 * @return {object}     object containing data and the temperature set
 */
function getCurrentConfig(now) {
    now = now || moment();
    var dateArray = [];
    var foundTime;

    for (let day of cfg.days) {
        for(let time of day.times) {
            dateArray.push({ 
                day: moment().day(day.index).format('dddd'),
                dayIndex: day.index,
                time: time.time,
                datetime: getMomentForTime(moment(), time.time).day(day.index)._d, 
                temperatures: time.temperatures 
            });
        }
    }

    dateArray.push({ datetime: now._d, now: true });

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

    return Zone.findOne({ number: cfg.zone })
        .then((data) => {
            return { 
                day: foundTime.day, 
                dayIndex: foundTime.dayIndex,
                time: foundTime.time, 
                temperatures: _.extend(cfg.defaults, foundTime.temperatures, { timer: data.customTemperature }) 
            };
        });
}

/**
 * helper function for getting the moment() object for a time string
 * @param  {object} now  moment.js object
 * @param  {string} time time string
 * @return {object}      moment.js object
 */
function getMomentForTime(now, time) {
    if (!time) return false;
    time = time.split(':');
    return moment(now).hour(time[0]).minute(time[1]);
}