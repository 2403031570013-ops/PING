
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const LostItem = require('./src/models/LostItem');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");
        const items = await LostItem.find().sort({ createdAt: -1 }).limit(5);
        items.forEach(item => {
            console.log(`Item: ${item.title}`);
            console.log(`Image Type: ${item.image ? (item.image.startsWith('data:') ? 'Base64' : 'URL/Path') : 'None'}`);
            console.log(`Image Start: ${item.image ? item.image.substring(0, 50) + '...' : 'N/A'}`);
            console.log('---');
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
