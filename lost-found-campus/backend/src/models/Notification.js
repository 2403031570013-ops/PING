const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 1000 },
    type: {
        type: String,
        enum: ['match', 'claim', 'chat', 'system', 'nft', 'karma', 'whatsapp', 'admin', 'security'],
        default: 'system'
    },
    read: { type: Boolean, default: false },
    data: { type: mongoose.Schema.Types.Mixed, default: null },
    actionUrl: { type: String, default: null },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
