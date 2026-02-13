const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    photoURL: { type: String, default: "" },
    campusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus' },
    role: { type: String, enum: ['student', 'staff', 'admin'], default: 'student' },
    isApproved: { type: Boolean, default: true }, // For staff/admin approval flow
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    pushToken: { type: String, default: "" },
    karmaPoints: { type: Number, default: 0 },
    academicYear: { type: String }, // e.g., '2024-25'
    semester: { type: Number },
    isPhoneVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date }
}, { timestamps: true });

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Static method to hash password
userSchema.statics.hashPassword = async function (password) {
    return bcrypt.hash(password, 10);
};

module.exports = mongoose.model('User', userSchema);
