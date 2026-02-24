const mongoose = require('mongoose');
require('dotenv').config();

const test = async () => {
    try {
        console.log("URI Type:", typeof process.env.MONGO_URI);
        const u = process.env.MONGO_URI || "";
        console.log("URI Length:", u.length);
        console.log("URI Start:", u.substring(0, 15) + "...");

        await mongoose.connect(u);
        console.log("✅ CONNECTED SUCCESS!");
        process.exit(0);
    } catch (e) {
        console.error("❌ FAILED:", e.message);
        process.exit(1);
    }
};

test();
