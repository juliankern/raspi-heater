var moment = require('moment');
var _ = require('lodash');
var cfg = require('../config.json');

var sensor = require('../lib/sensor');

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
            
            _getCurrentConfig(null, statuses.heatingMode).then((data) => {
                // manual mode may be globally active, but not in this zone
                // => use the actual status if not
                // => maybe not the best solution, but the best way for my own heater setup
                if (data.manual && data.temperatures['manual']) {
                    status = 'manual';
                }

                clog('CONTROL current status:', status);
                
                cb(status, data, statuses); 
            }).catch((err) => { clog('APP caught error', err); });
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
    if(process.env.LOGGING !== 'false') console.log.apply(null, args);  
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
function _getCurrentConfig(now, heatingMode) {
    now = now || moment();
    var dateArray = [];
    var foundTime;
    var manualMode = false;

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

    if (heatingMode && heatingMode.value !== 'auto') {
        manualMode = true;
        dateArray.push({ on: (heatingMode.value === 'on'), datetime: heatingMode.updatedAt, manual: true });
    }

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

    return Zone.findOne({ number: cfg.zone }).then((zoneData) => {
        if (foundTime.manual && now.diff(moment(foundTime.datetime), 'minutes') < cfg.manualModeDuration) {
            // manual mode is not overwritten by config AND not older than config (120min) 
            
            return { 
                manual: true,
                temperatures: { manual: zoneData.customTemperature || 20 }
            }
        } else if (manualMode) {
            // manualMode tryes to be still active, although it already too old
            // => reset it
            Status.findOneAndUpdate({ key: 'heatingMode' }, { value: 'auto' }, { new: true, upsert: true }).exec();

            foundIndex = foundIndex === 0 ? dateArray.length : foundIndex;
            foundTime = dateArray[foundIndex - 1];
        }

        return { 
            day: foundTime.day, 
            dayIndex: foundTime.dayIndex,
            time: foundTime.time, 
            temperatures: _.extend(cfg.defaultTemperatures, foundTime.temperatures) 
        }
    })

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