const mongoose = require('mongoose');

const campusSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    location: { type: String }, // General location string
    adminContact: { type: String },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true },
    allowedEmailDomains: [{ type: String }], // e.g., ['paruluniversity.ac.in']
    settings: {
        requireStaffApproval: { type: Boolean, default: false },
        allowAnonymousFound: { type: Boolean, default: true }
    }
}, { timestamps: true });

module.exports = mongoose.model('Campus', campusSchema);
