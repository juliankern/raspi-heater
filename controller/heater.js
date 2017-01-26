var moment = require('moment');

var app = require('../controller/app.js');
var cfg = require('../config.json');

var Status = require('../models/status.js');
var heater = require('../lib/heater.js');
var cooldownTimer;
var onTimer;

module.exports = (function() {
    setInterval(checkHeaterStatus, 1000 * 60 / 60);

    return {
        on,
        off,
        toggle
    };

    function on() {
        return toggle(true);
    }

    function off() {
        return toggle(false);
    }

    function toggleOLD(state) {
        Status.findOne({ 'key': 'heaterOn' }).select('key value').exec((err, oldStatus) => {
            var newSetting = false;

            app.log('HEATER: old status:', oldStatus.value);
            
            if (!oldStatus && typeof oldStatus.value !== 'string') {
                newSetting = true;
                var oldStatus = new Status({
                    key: 'heaterOn',
                    value: state
                });
            } 
            
            app.log('HEATER new heater status?:', state);
            
            if (state !== (oldStatus.value === 'true') || newSetting) {
                app.log('HEATER really toggle heater!');
                
                oldStatus.value = state;
                oldStatus.save((err, status) => {
                    if (status && status.value !== 'false') {
                        heater.on();
                    } else {
                        heater.off();
                    }
                });
            }
        })
    }

    function toggle(newState, timeout) {
        Status.findOneAndUpdate({ key: 'heaterOn' }, { value: newState }, { upsert: true }).select('key value').exec((err, oldState) => {
            app.log('HEATER trying to toggle status...');
            app.log('HEATER ...old status:', oldState.value);

            if (newState !== (oldState.value === 'true')) {
                app.log('HEATER ...toggle status! To:', newState);
            } else {
                app.log('HEATER ... nope. Nothing changed.');
            }
        });
    }

    function checkHeaterStatus() {
        var heater = false;
        var cooldown = false;

        Status.find({}).exec((err, statuses) => {
            if (statuses.heaterOn && statuses.heaterOn.value === 'true') {
                heater = true;
            }

            if (statuses.cooldownOn && statuses.cooldownOn.value === 'true') {
                cooldown = true;
            }
        });
    }
    

    function toggleHeater(state) {
        Status.findOne({ key: 'cooldownOn' }).exec((err, cooldownState) => {
            if (cooldownState.value === 'true') {
                // cooldown active
                if (moment().unix() - moment(cooldownState.updatedAt).unix() > (cfg.maxCooldownDuration * 60)) {
                    // cooldown too old
                }
            }
        });

        if (newState === false) {
            // turn off
            if (!timeout) {
                // without timeout
                app.log('HEATER turn OFF heater - clearing cooldown timeout');

                clearTimeout(cooldownTimer);
            } else {
                // with timeout
                app.log('HEATER ...starting timer for turning it back on.');

                cooldownTimer = setTimeout(function() { 
                    app.log('HEATER ... heater cooled down, turn it on again!');
                    Status.findOneAndUpdate({ key: 'cooldownOn' }, { value: false }, { upsert: true }).exec();

                    toggle(true, true); 
                }, 1000 * 60 * cfg.maxCooldownDuration);
            }

            app.log('HEATER - ACTUALLY turn OFF now');  
            heater.off();          
        } else {
            // turn on
            if (!timeout) {
                app.log('HEATER turn ON heater - starting new timeout...');
            } else {
                app.log('HEATER turn heater back on from cooldown...');
            }

            clearTimeout(onTimer);
            onTimer = setTimeout(function() { 
                app.log('HEATER ... heater was on for too long, cooldown turns it off!');
                Status.findOneAndUpdate({ key: 'cooldownOn' }, { value: true }, { upsert: true }).exec();

                toggle(false, true); 
            }, 1000 * 60 * cfg.maxOnDuration);
            
            app.log('HEATER - ACTUALLY turn ON now');
            heater.on();          
        }
    }
})();