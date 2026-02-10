const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

const email = "2403031570013@paruluniversity.ac.in";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");

        const user = await User.findOne({ email });
        if (user) {
            console.log(`Found user: ${user.fullName} (${user._id})`);
            await User.deleteOne({ _id: user._id });
            console.log("User DELETED successfully. You can now register again.");
        } else {
            console.log("User not found.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

connectDB();
