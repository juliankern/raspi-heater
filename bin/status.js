var mongoose = require('mongoose');
var moment = require('moment');

var app = require('../controller/app.js');

var Status = require('../models/status.js');
var Zone = require('../models/zone.js');

require('dotenv').load();
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

app.getCurrentStatus((status, data, statuses) => {
    console.log('######################');
    console.log('raspi-heater Status');
    console.log('######################');
    if (statuses.heaterOn) console.log('heaterOn -', statuses.heaterOn.value, '- since', moment(statuses.heaterOn.updatedAt).fromNow(true));
    if (statuses.targetHeaterOn) console.log('targetHeaterOn -', statuses.targetHeaterOn.value, '- since', moment(statuses.targetHeaterOn.updatedAt).fromNow(true));
    if (statuses.cooldownOn) console.log('cooldownOn -', statuses.cooldownOn.value, '- since', moment(statuses.cooldownOn.updatedAt).fromNow(true));
    if (statuses.heatingMode) console.log('heatingMode -', statuses.heatingMode.value, '- changed', moment(statuses.heatingMode.updatedAt).fromNow());
    console.log('######################');
    if (statuses.isHome) console.log('isHome - ', statuses.isHome.value);
    if (statuses.isHoliday) console.log('isHoliday - ', statuses.isHoliday.value);
    console.log('######################');
    
    Zone.findOne({ number: cfg.zone }).exec((err, zone) => {
        console.log('current temerature:', zone.currentTemperature.toFixed(1)); 
        console.log('target temerature:', zone.targetTemperature.toFixed(1)); 
        console.log('######################');
        
        process.exit(1);
    });
});