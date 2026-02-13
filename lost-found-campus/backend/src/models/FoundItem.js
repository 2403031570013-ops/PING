const mongoose = require("mongoose");

const FoundItemSchema = new mongoose.Schema({
    title: String,
    description: String,
    image: String,
    location: String,
    category: { type: String, default: 'Others' },
    campusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'resolved', 'expired', 'locked'], default: 'active' },
    isHighValue: { type: Boolean, default: false },
    adminNotes: { type: String, default: "" },
    cctvReference: { type: String, default: "" },
    lifecycle: [{
        status: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        note: String
    }],
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } // 30 days
});

// Indexes for common queries
FoundItemSchema.index({ campusId: 1, status: 1, createdAt: -1 });
FoundItemSchema.index({ postedBy: 1, status: 1 });
FoundItemSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model("FoundItem", FoundItemSchema);
