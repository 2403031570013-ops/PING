const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

const fixKarma = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");

        // Email from screenshot: 2403031570013@paruluniversity.ac.in
        const email = "2403031570013@paruluniversity.ac.in";
        const user = await User.findOne({ email });

        if (user) {
            console.log(`Found user: ${user.fullName}, Karma: ${user.karmaPoints || 0}`);
            // Check if we need to update
            if (!user.karmaPoints || user.karmaPoints === 0) {
                user.karmaPoints = 50; // Assume 1 successful claim
                await user.save();
                console.log("Updated Karma to 50.");
            } else {
                console.log("Karma already present.");
            }
        } else {
            console.log("User not found.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

fixKarma();
