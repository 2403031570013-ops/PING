const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['student', 'admin', 'staff'], default: 'student' },
    campusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus' },
    phone: { type: String, default: null },
    googleId: { type: String, default: null, unique: true, sparse: true },
    photoURL: { type: String, default: null },

    // Account status
    isApproved: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },

    // OTP management
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    otpLockedUntil: { type: Date, default: null },

    // Gamification
    karmaPoints: { type: Number, default: 0 },

    // Push Notifications
    pushToken: { type: String, default: null },

    // Refresh Token
    refreshToken: { type: String, default: null },

    // NFT Gallery (simulated)
    nftBadges: [{
        badgeId: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String },
        imageUrl: { type: String },
        itemId: { type: mongoose.Schema.Types.ObjectId },
        awardedAt: { type: Date, default: Date.now },
        txHash: { type: String }
    }],

    // WhatsApp integration
    whatsappNumber: { type: String, default: null },
    whatsappVerified: { type: Boolean, default: false },

    // Security tracking
    lastLoginAt: { type: Date },
    loginCount: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date, default: null },
    adminKeyFailedAttempts: { type: Number, default: 0 },
    adminKeyLockoutUntil: { type: Date, default: null },

    // Notifications

    // Blocked users
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

}, { timestamps: true });

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ campusId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ karmaPoints: -1 });

// Static method to hash password (used during seeding)
userSchema.statics.hashPassword = async function (plainPassword) {
    return bcrypt.hash(plainPassword, 12);
};

// Pre-save hook: hash password if modified
// Note: async hooks in Mongoose 7+ do NOT receive next()
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

// Instance method: compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
