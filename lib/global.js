var moment = require('moment');
var _ = require('lodash');
var cfg = require('../config.json');

var sensor = require('./sensor');

var Status = require('../models/status.js');
var Zone = require('../models/zone.js');

function getCurrentStatus(cb) {
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
            
            _getCurrentConfig().then((data) => {
                if (statuses.heatingMode && statuses.heatingMode.value === '1') {
                    status = 'timer';
                }
                
                clog('CONTROL current status:', status);
                
                cb(status, data, statuses); 
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

function clog() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[' + moment().format('YYYY-MM-DD HH:mm:ss') + ']');
    console.log.apply(null, args);  
}

function updateCurrentTemperature(temp, cb) {
    Zone.findOneAndUpdate(
        { number: cfg.zone }, 
        { currentTemperature: temp }, 
        { new: true, upsert: true }
    ).exec(cb);
}

function getCurrentTemperature(cb) {
    sensor.read().then(cb);
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

/**
 * gets the current status and sets the target temperature accordingly
 * @param {Function} cb callback after setting the target
 */
function updateTargetTemperature(cb) {
    getCurrentStatus((status, data) => {
        var temperature = data.temperatures[status];
                
        clog('CONTROL current config:', data);
        clog('CONTROL found temperature:', temperature);

        Zone.findOneAndUpdate({ number: cfg.zone }, { targetTemperature: temperature })
            .select('number currentTemperature targetTemperature')
            .exec(cb);
    });
}

/**
 * gets the current temperature set relative to current (or "now"-based-) time
 * @param  {object} now moment.js Obj for setting the current time - if undefined use real now
 * @return {object}     object containing data and the temperature set
 */
function _getCurrentConfig(now) {
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

// exports

module.exports = {
    log: clog,
    getCurrentStatus: getCurrentStatus,
    updateCurrentTemperature: updateCurrentTemperature,
    getCurrentTemperature: getCurrentTemperature,
    updateTargetTemperature: updateTargetTemperature,
    roundTemperature: roundTemperature,
    getMomentForTime: getMomentForTime
}