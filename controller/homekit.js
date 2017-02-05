var path = require('path');

var accessoryLoader = require('hap-nodejs/lib/AccessoryLoader');

// Load up all accessories in the /accessories folder
var dir = path.join(__dirname, '../accessories');
var accessories = accessoryLoader.loadDirectory(dir);

// Publish them all separately (as opposed to BridgedCore which publishes them behind a single Bridge accessory)
accessories.forEach(function(accessory) {

    // To push Accessories separately, we'll need a few extra properties
    if (!accessory.username)
        throw new Error('Username not found on accessory "' + accessory.displayName + '". Core.js requires all accessories to define a unique "username" property.');

    if (!accessory.pincode)
        throw new Error('Pincode not found on accessory "' + accessory.displayName + '". Core.js requires all accessories to define a "pincode" property.');
});

module.exports = {
    accessories: accessories
}