const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Recipient
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'claim', 'resolved', 'system'], default: 'info' },
    read: { type: Boolean, default: false },
    data: { type: Object } // Optional payload (itemId etc)
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
