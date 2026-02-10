const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    location: { type: String }, // General location string
    adminContact: { type: String },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Campus', campusSchema);
