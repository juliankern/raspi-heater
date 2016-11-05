var mongoose = require('mongoose');

var schemaOptions = {
    timestamps: true,
    toJSON: {
        virtuals: true
    },
};

var schema = new mongoose.Schema({
    key: String,
    value: String
}, schemaOptions);

var Model = mongoose.model('Status', schema);

module.exports = Model;
