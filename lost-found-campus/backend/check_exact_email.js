require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const connectDB = require('./src/config/db');

const checkExactEmail = async () => {
    await connectDB();
    const user = await User.findOne({ email: /2403031570013/i });
    if (user) {
        console.log("EXACT EMAIL IN DB: [" + user.email + "]");
    } else {
        console.log("No user found with that ID pattern");
    }
    process.exit();
};

checkExactEmail();
