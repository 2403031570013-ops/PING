const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

async function verifyUser() {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lostfound';
        // Note: This won't work easily with the memory server locked files.
        // Instead, I'll use a temporary route again or just tell the user to reset once more.
        console.log("Use the debug route if possible or a reset.");
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
verifyUser();
