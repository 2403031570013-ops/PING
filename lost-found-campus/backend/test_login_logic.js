require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const connectDB = require('./src/config/db');

const emailInput = "2403031570013@paruluniversity.ac.in";
const passwordInput = "123456";

const testLogin = async () => {
    await connectDB();
    const user = await User.findOne({ email: emailInput.toLowerCase().trim() });
    if (!user) {
        console.log("User NOT FOUND in DB for email:", emailInput);
        const allUsers = await User.find({}, 'email');
        console.log("All emails in DB:", allUsers.map(u => u.email));
    } else {
        console.log("User found:", user.email);
        const isMatch = await user.comparePassword(passwordInput);
        console.log("Password match for '123456':", isMatch);

        // Let's also check if the password field is actually hashed properly
        if (user.password.length < 20) {
            console.log("WARNING: Password in DB looks PLAIN TEXT:", user.password);
        }
    }
    process.exit();
};

testLogin();
