const mongoose = require('mongoose');

const userReportSchema = new mongoose.Schema({
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
        type: String,
        enum: ['harassment', 'fake_account', 'scam', 'inappropriate', 'spam', 'impersonation', 'hate_speech', 'other'],
        required: true
    },
    description: { type: String, maxlength: 500 },
    evidence: { type: String, default: null }, // optional screenshot path
    status: {
        type: String,
        enum: ['pending', 'investigating', 'action_taken', 'dismissed'],
        default: 'pending'
    },
    adminNotes: { type: String, default: null },
    actionTaken: { type: String, default: null }, // 'warning', 'suspended', 'banned', 'none'
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null }
}, { timestamps: true });

// Prevent duplicate active reports
userReportSchema.index({ reporterId: 1, reportedUserId: 1, status: 1 });
userReportSchema.index({ reportedUserId: 1, status: 1 });

module.exports = mongoose.model('UserReport', userReportSchema);
