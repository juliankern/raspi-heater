
var mongoose = require('mongoose');
var moment = require('moment');
var table = require('text-table');

var app = require('../controller/app.js');

var Status = require('../models/status.js');
var Zone = require('../models/zone.js');

require('dotenv').load();
process.env.LOGGING = false;
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

function onoff(val) {
    if (typeof val === 'boolean') return val ? 'on' : 'off'; 
    else return val === 'true' ? 'on' : 'off';
}

var lines = [];

console.log();
console.log('########################');
console.log('#### raspi-heater Status');
console.log('########################');
lines.push([ 'zone', cfg.zone ]);
lines.push([ 'maxOnDuration', cfg.maxOnDuration + ' Minutes' ]);
lines.push([ 'maxCooldownDuration', cfg.maxCooldownDuration + ' Minutes' ]);
lines.push([ 'manualModeDuration', cfg.manualModeDuration + ' Minutes' ]);
console.log(table(lines));
lines = [];
console.log('######################');

app.getCurrentStatus((status, data, statuses) => {
    if (statuses.heaterOn) lines.push([ 'heaterOn', onoff(statuses.heaterOn.value), 'since ' + moment(statuses.heaterOn.updatedAt).fromNow(true) ]);
    if (statuses.targetHeaterOn) lines.push([ 'targetHeaterOn', onoff(statuses.targetHeaterOn.value), 'since ' + moment(statuses.targetHeaterOn.updatedAt).fromNow(true) ]);
    if (statuses.cooldownOn) lines.push([ 'cooldownOn', onoff(statuses.cooldownOn.value), 'since ' + moment(statuses.cooldownOn.updatedAt).fromNow(true) ]);
    if (statuses.heatingMode) lines.push([ 'heatingMode', statuses.heatingMode.value, 'changed ' + moment(statuses.heatingMode.updatedAt).fromNow() ]);
    console.log(table(lines));
    lines = [];
    console.log('######################');
    lines.push([ 'status', status ]);
    if (statuses.isHome) lines.push([ 'isHome', statuses.isHome.value ]);
    if (statuses.isHoliday) lines.push([ 'isHoliday', statuses.isHoliday.value ]);
    console.log(table(lines));
    lines = [];
    console.log('######################');
    
    Zone.findOne({ number: cfg.zone }).exec((err, zone) => {
        lines.push([ 'current temerature:', zone.currentTemperature.toFixed(2) + '°C' ]); 
        lines.push([ 'target temerature:', zone.targetTemperature.toFixed(2) + '°C' ]); 
        console.log(table(lines));
        console.log('######################');
        console.log();
        
        process.exit(1);
    });
});