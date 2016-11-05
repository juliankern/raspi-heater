var mongoose = require('mongoose');

var schemaOptions = {
    timestamps: true,
    toJSON: {
        virtuals: true
    },
};

var schema = new mongoose.Schema({
    number: Number,
    name: String,
    currentTemperature: Number,
    targetTemperature: Number
}, schemaOptions);

var Model = mongoose.model('Zone', schema);

module.exports = Model;
