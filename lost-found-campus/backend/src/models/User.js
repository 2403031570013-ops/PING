const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    photoURL: { type: String, default: "" },
    campusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus' },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    pushToken: { type: String, default: "" },
    karmaPoints: { type: Number, default: 0 }
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
