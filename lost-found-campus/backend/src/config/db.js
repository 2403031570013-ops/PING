const mongoose = require("mongoose");
const dns = require("dns");

dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 50,
            wtimeoutMS: 2500,
        });
        console.log("✅ MongoDB Connected");
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
        // Don't exit, allow the server to stay alive and return 500s
    }
};

module.exports = connectDB;
