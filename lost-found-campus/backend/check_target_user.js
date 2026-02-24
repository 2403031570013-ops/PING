require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const connectDB = require('./src/config/db');

const email = "2403031570013@paruluniversity.ac.in";

const checkUser = async () => {
    await connectDB();
    const user = await User.findOne({ email });
    if (!user) {
        console.log("User not found");
    } else {
        console.log("User Details:");
        console.log("Email:", user.email);
        console.log("Is Phone Verified:", user.isPhoneVerified);
        console.log("Is Approved:", user.isApproved);
        console.log("Status:", user.status);
        console.log("Password (Hashed):", user.password);
    }
    process.exit();
};

checkUser();
