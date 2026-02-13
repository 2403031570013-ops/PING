const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({}, 'email fullName password role');
        console.log('--- Users in Database ---');
        users.forEach(u => {
            console.log(`Email: ${u.email}, Name: ${u.fullName}, HasPassword: ${!!u.password}, Role: ${u.role}`);
        });
        console.log('-------------------------');
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

checkUsers();
