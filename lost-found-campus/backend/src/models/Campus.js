const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    location: { type: String, default: '' },
    adminContact: {
        name: { type: String, default: '' },
        email: { type: String, default: '' },
        phone: { type: String, default: '' }
    },
    allowedEmailDomains: [{ type: String }],
    isActive: { type: Boolean, default: true },
    settings: {
        requireStaffApproval: { type: Boolean, default: false },
        autoMatchEnabled: { type: Boolean, default: true },
        maxItemAge: { type: Number, default: 30 }, // days before archiving
        nftBadgesEnabled: { type: Boolean, default: true },
        whatsappEnabled: { type: Boolean, default: false },
    },
    landmarks: [{
        name: { type: String },
        coordinates: {
            latitude: { type: Number },
            longitude: { type: Number }
        },
        type: { type: String, enum: ['academic', 'food', 'hostel', 'sports', 'hospital', 'admin', 'other'], default: 'other' }
    }]
}, { timestamps: true });

campusSchema.index({ name: 1 });

module.exports = mongoose.model('Campus', campusSchema);
