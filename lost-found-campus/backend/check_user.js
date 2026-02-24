const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

async function checkUser() {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lostfound';
        await mongoose.connect(uri);

        const user = await User.findOne({ email: '2403031570013@paruluniversity.ac.in' });
        if (user) {
            console.log("User found:");
            console.log("Email:", user.email);
            console.log("isPhoneVerified:", user.isPhoneVerified);
            console.log("isApproved:", user.isApproved);
            console.log("Status:", user.status);
            console.log("Failed attempts:", user.failedLoginAttempts);
        } else {
            console.log("User NOT found.");
        }

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

checkUser();
