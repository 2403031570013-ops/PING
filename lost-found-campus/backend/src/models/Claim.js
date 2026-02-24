const mongoose = require('mongoose');
const crypto = require('crypto');

const claimSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'itemType' },
    itemType: { type: String, enum: ['LostItem', 'FoundItem'], required: true },
    claimantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled', 'expired'],
        default: 'pending'
    },
    handoverCode: {
        type: String,
        default: () => crypto.randomInt(100000, 999999).toString()
    },
    handoverVerifiedAt: { type: Date, default: null },

    // Feedback after completion
    feedback: {
        rating: { type: Number, min: 1, max: 5, default: null },
        comment: { type: String, default: null },
        givenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
    },

    // Evidence for claim
    evidence: { type: String, default: null },
    description: { type: String, default: null, maxlength: 500 },

    // Timestamps for status changes
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    // Verification attempt tracking
    verificationAttempts: { type: Number, default: 0 },
    maxVerificationAttempts: { type: Number, default: 5 },
}, { timestamps: true });

// Indexes
claimSchema.index({ claimantId: 1, status: 1 });
claimSchema.index({ ownerId: 1, status: 1 });
claimSchema.index({ itemId: 1 });

module.exports = mongoose.model('Claim', claimSchema);
