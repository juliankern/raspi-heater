var mongoose = require('mongoose');
var path = require('path');
var HAP = require('hap-nodejs');

var Zone = require('./models/zone.js');

require('dotenv').load();
var cfg = require('./config.json');

// init the HAP-server
HAP.init();
var storage = require('node-persist');
var uuid = HAP.uuid;
var Accessory = HAP.Accessory;
var accessoryLoader = require('hap-nodejs/lib/AccessoryLoader');

// set the mongoose promise library to the nodejs one, required by mongoose now
mongoose.Promise = global.Promise;
// connect to the mongodb
mongoose.connect(process.env.MONGODB);
// output an error if the connection fails - kill the app
mongoose.connection.on('error', function() {
    console.error('ERROR - MongoDB Connection Error. Please make sure that MongoDB is running.');
    process.exit(1);
});

// Initialize our storage system
storage.initSync();

// Our Accessories will each have their own HAP server; we will assign ports sequentially
var targetPort = 51826;

// Load up all accessories in the /accessories folder
var dir = path.join(__dirname, "accessories");
var accessories = accessoryLoader.loadDirectory(dir);

console.log("HAP-NodeJS starting...");
// Publish them all separately (as opposed to BridgedCore which publishes them behind a single Bridge accessory)
accessories.forEach(function(accessory) {

    // To push Accessories separately, we'll need a few extra properties
    if (!accessory.username)
        throw new Error("Username not found on accessory '" + accessory.displayName +
            "'. Core.js requires all accessories to define a unique 'username' property.");

    if (!accessory.pincode)
        throw new Error("Pincode not found on accessory '" + accessory.displayName +
            "'. Core.js requires all accessories to define a 'pincode' property.");

    // console.log('test', accessory.services[0].characteristics);
    // publish this Accessory on the local network
    accessory.publish({
        port: targetPort++,
        username: accessory.username,
        pincode: accessory.pincode
    });

    console.log('Accessory published!', accessory.displayName, accessory.pincode)
});

