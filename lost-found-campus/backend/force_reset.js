require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const connectDB = require('./src/config/db');
const bcrypt = require('bcryptjs');

const email = "2403031570013@paruluniversity.ac.in";
const newPassword = "123456";

const forceReset = async () => {
    await connectDB();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Using updateOne to bypass any middleware and set the hash directly
    const result = await User.updateOne(
        { email: email.toLowerCase().trim() },
        { $set: { password: hashedPassword, isApproved: true, status: 'active', isPhoneVerified: true } }
    );

    console.log("Update Result:", result);

    // Verify
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    const isMatch = await bcrypt.compare(newPassword, user.password);
    console.log("Immediate Verification Match:", isMatch);

    process.exit();
};

forceReset();
