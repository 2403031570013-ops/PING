
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const LostItem = require('./src/models/LostItem');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const item = await LostItem.findOne({ title: /idol photo/i });
        if (item) {
            console.log('IDOL PHOTO ITEM FOUND');
            console.log('Image Data Start:', item.image ? item.image.substring(0, 100) : 'NULL');
            console.log('Image Data Length:', item.image ? item.image.length : 0);
        } else {
            console.log('IDOL PHOTO ITEM NOT FOUND');
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
