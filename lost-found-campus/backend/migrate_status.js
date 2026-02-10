const mongoose = require('mongoose');
require('dotenv').config();
const LostItem = require('./src/models/LostItem');
const FoundItem = require('./src/models/FoundItem');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");

        const lostRes = await LostItem.updateMany(
            { status: { $exists: false } },
            { $set: { status: 'active' } }
        );
        console.log(`Updated ${lostRes.modifiedCount} Lost Items to status: active`);

        const foundRes = await FoundItem.updateMany(
            { status: { $exists: false } },
            { $set: { status: 'active' } }
        );
        console.log(`Updated ${foundRes.modifiedCount} Found Items to status: active`);

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

connectDB();
