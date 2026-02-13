const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['LOGIN', 'LOGOUT', 'TOKEN_REFRESH'], default: 'LOGIN' },
    ipAddress: String,
    deviceInfo: {
        browser: String,
        os: String,
        platform: String // web, android, ios
    },
    location: {
        city: String,
        country: String
    }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
