const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    itemType: { type: String, enum: ['lost', 'found'], required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
        type: String,
        enum: ['inappropriate', 'spam', 'fake', 'duplicate', 'offensive', 'other'],
        required: true
    },
    description: { type: String },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' }
}, { timestamps: true });

// Optimizing Admin Dashboard queries
reportSchema.index({ status: 1 });
reportSchema.index({ itemId: 1, itemType: 1 });

module.exports = mongoose.model('Report', reportSchema);
