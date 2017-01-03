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
        Status.findOne({ 'key': 'heaterOn' }).select('key value').exec((err, oldStatus) => {
            var newSetting = false;

            console.log('HEATER: old status:', oldStatus.value);
            
            if (!oldStatus && typeof oldStatus.value !== 'string') {
                newSetting = true;
                var oldStatus = new Status({
                    key: 'heaterOn',
                    value: state
                });
            } 
            
            console.log('HEATER new heater status?:', state);
            
            if (state !== (oldStatus.value === 'true') || newSetting) {
                console.log('HEATER really toggle heater!');
                
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