const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: { type: String, required: true }, // e.g., 'SUSPEND_USER', 'APPROVE_CLAIM', 'LOCK_ITEM'
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    targetType: { type: String, required: true, enum: ['User', 'Claim', 'LostItem', 'FoundItem', 'Campus'] },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    campusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    note: String,
    ipAddress: String,
    userAgent: String
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
