const mongoose = require('mongoose');
require('dotenv').config();
const LostItem = require('./src/models/LostItem');
const User = require('./src/models/User');

const fixHistory = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");

        // 1. Find the User 'hat anik'
        const user = await User.findOne({ email: "2403031570013@paruluniversity.ac.in" });
        if (!user) {
            console.log("User not found");
            return;
        }
        console.log(`User ID: ${user._id}`);

        // 2. Find the Item 'gnums print' (or similar title)
        const item = await LostItem.findOne({ title: { $regex: /gnums/i } });
        if (!item) {
            console.log("Item 'gnums print' not found in LostItems");
            // Maybe it's FoundItem?
            // No, context says he returned it.
            return;
        }

        console.log(`Found Item: ${item.title}, Status: ${item.status}, ResolvedBy: ${item.resolvedBy}`);

        // 3. Update ResolvedBy
        item.status = 'resolved';
        item.resolvedBy = user._id;
        await item.save();

        console.log("Fixed Item History: Marked as Resolved by Hat Anik.");

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

fixHistory();
