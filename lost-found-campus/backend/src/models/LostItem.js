const mongoose = require('mongoose');

const lostItemSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    location: { type: String, required: true, trim: true },
    category: {
        type: String,
        enum: ['Electronics', 'Documents', 'Accessories', 'Clothing', 'Keys', 'Bags', 'Others'],
        default: 'Others'
    },
    image: { type: String, default: null },
    status: { type: String, enum: ['active', 'resolved', 'archived', 'locked'], default: 'active' },
    coordinates: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null }
    },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    campusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Enhanced fields
    bounty: { type: Number, default: 0, min: 0 },
    priority: { type: String, enum: ['normal', 'high'], default: 'normal' },
    isInsured: { type: Boolean, default: false },
    tags: [{ type: String, trim: true }],

    // AI matching embeddings (simulated)
    embedding: { type: [Number], default: [] },

    // Moderation
    flagged: { type: Boolean, default: false },
    flagReason: { type: String, default: null },

    // View tracking
    viewCount: { type: Number, default: 0 },
}, { timestamps: true });

// Indexes for common queries
lostItemSchema.index({ campusId: 1, status: 1 });
lostItemSchema.index({ postedBy: 1 });
lostItemSchema.index({ category: 1 });
lostItemSchema.index({ createdAt: -1 });
lostItemSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('LostItem', lostItemSchema);
