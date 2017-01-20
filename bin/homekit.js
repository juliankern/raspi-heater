var mongoose = require('mongoose');
var HAP = require('hap-nodejs');

var app = require('../controller/app.js');
var homekit = require('../controller/homekit.js');

require('dotenv').load();
var cfg = require('../config.json');

app.log("HAP-NodeJS starting...");

// set the mongoose promise library to the nodejs one, required by mongoose now
mongoose.Promise = global.Promise;
// connect to the mongodb
mongoose.connect(process.env.MONGODB);
// output an error if the connection fails - kill the app
mongoose.connection.on('error', function() {
    console.error('ERROR - MongoDB Connection Error. Please make sure that MongoDB is running.');
    process.exit(1);
});

// init the HAP-server
HAP.init();
var storage = require('node-persist');
var uuid = HAP.uuid;

// Initialize our storage system
storage.initSync();

// Our Accessories will each have their own HAP server; we will assign ports sequentially
var targetPort = 51826;

// Publish them all separately (as opposed to BridgedCore which publishes them behind a single Bridge accessory)
homekit.accessories.forEach(function(accessory) {

    // publish this Accessory on the local network
    accessory.publish({
        port: targetPort++,
        username: accessory.username,
        pincode: accessory.pincode
    });

    app.log('Accessory published!', accessory.displayName, accessory.pincode)
});

