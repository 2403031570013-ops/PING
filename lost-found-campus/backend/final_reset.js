require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const connectDB = require('./src/config/db');

const email = "2403031570013@paruluniversity.ac.in";
const newPassword = "123456";

const finalReset = async () => {
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
        user.password = await User.hashPassword(newPassword);
        user.isApproved = true;
        user.status = 'active';
        user.isPhoneVerified = true;
        await user.save();
        console.log("FINAL RESET SUCCESS FOR:", user.email);

        const isMatch = await user.comparePassword(newPassword);
        console.log("Match check immediately after save:", isMatch);
    } else {
        console.log("User not found");
    }
    process.exit();
};

finalReset();
