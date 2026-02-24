const mongoose = require('mongoose');

const FraudReportSchema = new mongoose.Schema({
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    itemType: { type: String, enum: ['LostItem', 'FoundItem'], required: true },
    reason: { type: String, required: true },
    details: { type: String },
    status: { type: String, enum: ['pending', 'investigating', 'resolved', 'dismissed'], default: 'pending' },
    adminNotes: { type: String },
    fraudScore: { type: Number, default: 0 }, // 0-100
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FraudReport', FraudReportSchema);
