const mongoose = require('mongoose');

/**
 * WhatsApp Message Log Model
 * Tracks all WhatsApp bot interactions for audit and debugging.
 */
const whatsappLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    phoneNumber: { type: String, required: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    messageType: {
        type: String,
        enum: ['notification', 'command', 'response', 'verification', 'error'],
        default: 'notification'
    },
    command: { type: String, default: null }, // e.g., 'STATUS', 'MY ITEMS', 'HELP'
    content: { type: String, required: true, maxlength: 4096 },
    templateName: { type: String, default: null },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read', 'failed', 'pending'],
        default: 'pending'
    },
    errorMessage: { type: String, default: null },

    // Linked data
    itemId: { type: mongoose.Schema.Types.ObjectId, default: null },
    claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', default: null },

    // WhatsApp API response
    waMessageId: { type: String, default: null },
    webhookPayload: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

whatsappLogSchema.index({ userId: 1 });
whatsappLogSchema.index({ phoneNumber: 1 });
whatsappLogSchema.index({ createdAt: -1 });
whatsappLogSchema.index({ status: 1 });

module.exports = mongoose.model('WhatsappLog', whatsappLogSchema);
