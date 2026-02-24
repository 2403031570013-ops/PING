const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

async function checkUsers() {
    try {
        console.log("Connecting to DB...");
        // Handle in-memory fallback if no MONGO_URI
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lostfound';
        await mongoose.connect(uri);

        const users = await User.find({}, 'email fullName otp otpExpires');
        console.log("Total users found:", users.length);
        console.log(JSON.stringify(users, null, 2));

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

checkUsers();
