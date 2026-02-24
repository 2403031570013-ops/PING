require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const connectDB = require('./src/config/db');
const bcrypt = require('bcryptjs');

const email = "2403031570013@paruluniversity.ac.in";
const passwordToTest = "123456";

const debugUser = async () => {
    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
        console.log("User not found");
        process.exit();
    }

    console.log("Found User:", user.email);
    console.log("Password in DB (Hash):", user.password);

    const isMatch = await bcrypt.compare(passwordToTest, user.password);
    console.log("Manual Bcrypt Compare ('123456'):", isMatch);

    const isMatchMethod = await user.comparePassword(passwordToTest);
    console.log("User.comparePassword() Result:", isMatchMethod);

    process.exit();
};

debugUser();
