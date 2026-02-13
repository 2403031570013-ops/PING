const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const fs = require('fs');

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({ role: 'admin' }, 'email role');
        let output = '--- Admin Email ---\n';
        users.forEach(u => {
            output += u.email + '\n';
        });
        output += '-------------------\n';
        fs.writeFileSync('admin_output.txt', output);
        console.log("Written to admin_output.txt");
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

checkAdmin();
