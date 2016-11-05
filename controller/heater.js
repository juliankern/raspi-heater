var Status = require('../models/status.js');
var heater = require('../lib/heater.js');

module.exports = (function() {
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

    function toggle(state) {
        Status.findOne({ key: 'heaterOn' }).exec((err, oldStatus) => {
            var newSetting = false;

            if (!oldStatus) {
                newSetting = true;
                var oldStatus = new Status({
                    key: 'heaterOn',
                    value: state
                });
            } 
            
            console.log('toggle heater?!', state, newSetting, oldStatus);
            
            if (state !== (oldStatus.value === 'true') || newSetting) {
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
})();