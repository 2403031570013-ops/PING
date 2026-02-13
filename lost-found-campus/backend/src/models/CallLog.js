const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
    caller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['voice', 'video'],
        default: 'voice'
    },
    status: {
        type: String,
        enum: ['missed', 'completed', 'declined', 'cancelled'],
        required: true
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    duration: {
        type: Number, // in seconds
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('CallLog', callLogSchema);
