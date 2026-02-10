const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Force Node to use Google DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function test() {
    try {
        console.log("Forcing Google DNS...");
        console.log("Connecting to:", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI, {
            tlsAllowInvalidCertificates: true,
            serverSelectionTimeoutMS: 10000
        });
        console.log("SUCCESS: Connected to Atlas!");
        process.exit(0);
    } catch (err) {
        console.error("FAILURE:", err.name, ":", err.message);
        process.exit(1);
    }
}

test();
