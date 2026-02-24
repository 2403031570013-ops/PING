require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const connectDB = require('./src/config/db');

const email = "2403031570013@paruluniversity.ac.in";
const newPassword = "123456";

const resetPassword = async () => {
    await connectDB();
    const user = await User.findOne({ email });
    if (!user) {
        console.log("User not found");
    } else {
        const hashedPassword = await User.hashPassword(newPassword);
        user.password = hashedPassword;
        await user.save();
        console.log("Password reset success for", email, "to", newPassword);
    }
    process.exit();
};

resetPassword();
