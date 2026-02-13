const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const fs = require('fs');

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({}, 'email fullName password role');
        fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
        console.log('Saved to users.json');
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

checkUsers();
