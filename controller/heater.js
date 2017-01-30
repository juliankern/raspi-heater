var moment = require('moment');

var app = require('../controller/app.js');
var cfg = require('../config.json');

var Status = require('../models/status.js');

var heaterHrdwr = require('../lib/heater.js');

var cooldownTimer;
var onTimer;

function on() {
    return toggle(true);
}

function off() {
    return toggle(false);
}

function get() {
    var heater = false;
    var targetHeater = false;
    var cooldown = false;
    
    return Status.findOne({}).select('key value').then((statuses) => { console.log('getdatshit', Object.keys(statuses));
        if (statuses.heaterOn && statuses.heaterOn.value === 'true') {
            heater = true;
        }
        
        if (statuses.targetHeaterOn && statuses.targetHeaterOn.value === 'true') {
            targetHeater = true;
        }

        if (statuses.cooldownOn && statuses.cooldownOn.value === 'true') {
            cooldown = true;
        }
        
        return { 
            heater, 
            targetHeater,
            cooldown, 
            statuses 
        };
    }).catch((err) => { throw err; });
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

function toggle(newState) {
    Status.findOneAndUpdate({ key: 'targetHeaterOn' }, { value: newState }, { upsert: true }).select('key value').exec((err, oldState) => {
        app.log('HEATER trying to toggle status...');
        app.log('HEATER ...old status:', oldState.value || false);

        if (!oldState || newState !== (oldState.value === 'true')) {
            app.log('HEATER ...toggle status! To:', newState);
        } else {
            app.log('HEATER ... nope. Nothing changed.');
        }
    });
}

function checkHeaterStatus() {
    var heater = false;
    var targetHeater = false;
    var cooldown = false;
    
    app.log('HEATER checkHeaterStatus');

    get().then((data) => {
        var statuses = data.statuses;
        cooldown = data.cooldown;
        targetHeater = data.targetHeater;
        heater = data.heater;
        
        app.log('HEATER checkHeaterStatus - cooldown:', cooldown);
        app.log('HEATER checkHeaterStatus - heater:', heater);
        app.log('HEATER checkHeaterStatus - targetHeater:', targetHeater);
        
        if (cooldown && (moment().unix() - moment(statuses.cooldownOn.updatedAt).unix() > (cfg.maxCooldownDuration * 60))) {
            // cooldown state is too old - turn cooldown off
            app.log('HEATER checkHeaterStatus - cooldown state too old, turn it off');
            Status.findOneAndUpdate({ key: 'cooldownOn' }, { value: false }, { upsert: true }).exec();
            cooldown = false;
        }
        
        if (targetHeater) {
            // heater is supposed to be on
            if (heater && (moment().unix() - moment(statuses.heaterOn.updatedAt).unix() > (cfg.maxOnDuration * 60))) {
                // heater is on for too long => start cooldown
                app.log('HEATER checkHeaterStatus - heater is on for too long, turn it off');
                Status.findOneAndUpdate({ key: 'heaterOn' }, { value: false }, { upsert: true }).exec();
                Status.findOneAndUpdate({ key: 'cooldownOn' }, { value: true }, { upsert: true }).exec();
                heater = false;
                cooldown = true;
            }
            
            if(!heater && !cooldown) {
                // heater is off, should be on AND cooldown off => turn it on!
                app.log('HEATER checkHeaterStatus - heater is off for too long, turn it on');
                Status.findOneAndUpdate({ key: 'heaterOn' }, { value: true }, { upsert: true }).exec();
                heater = true;
            }
        } 
        
        app.log('HEATER checkHeaterStatus - ACTUALLY cooldown:', cooldown);
        app.log('HEATER checkHeaterStatus - ACTUALLY heater:', heater);
        
        
        if (heater && !cooldown) {
            // heater on - but no cooldown
            heaterHrdwr.on();          
        }
        
        if (!heater) {
            heaterHrdwr.off();          
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


module.exports = {
    on,
    off,
    toggle,
    get,
    checkHeaterStatus
};