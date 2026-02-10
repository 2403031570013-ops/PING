const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
    try {
        console.log("Connecting to:", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI, {
            tlsAllowInvalidCertificates: true,
            serverSelectionTimeoutMS: 5000
        });
        console.log("SUCCESS: Connected to Atlas!");
        process.exit(0);
    } catch (err) {
        console.error("FAILURE:", err);
        process.exit(1);
    }
}

test();
