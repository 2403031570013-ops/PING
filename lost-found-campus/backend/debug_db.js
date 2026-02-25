
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env from the same directory as script
dotenv.config();

// Fix model paths
const LostItem = require('./src/models/LostItem');
const FoundItem = require('./src/models/FoundItem');

async function check() {
    try {
        if (!process.env.MONGO_URI) {
            console.log('NO MONGO_URI in .env');
            // Try fallback
            const fallback = 'mongodb+srv://admin:admin@cluster0.mongodb.net/lostfound?retryWrites=true&w=majority';
            await mongoose.connect(fallback);
        } else {
            await mongoose.connect(process.env.MONGO_URI);
        }

        console.log('Connected to DB');

        // Look for the most recent item with title "hjk" or "idol photo"
        const titles = [/hjk/i, /idol/i, /aadhar/i];
        for (const title of titles) {
            let item = await LostItem.findOne({ title }).sort({ createdAt: -1 });
            if (!item) {
                item = await FoundItem.findOne({ title }).sort({ createdAt: -1 });
            }

            if (item) {
                console.log(`\n--- ITEM FOUND: "${item.title}" ---`);
                console.log('ID:', item._id);
                console.log('Image Data exists:', !!item.image);
                if (item.image) {
                    console.log('Image Data Type:', typeof item.image);
                    console.log('Image Data Start:', item.image.substring(0, 100));
                    console.log('Image Data End:', item.image.substring(item.image.length - 100));
                    console.log('Image Data Length:', item.image.length);

                    if (item.image.includes('undefined')) {
                        console.log('!!!! CORRUPTED: Contains "undefined" !!!');
                    }
                    if (item.image.startsWith('blob:')) {
                        console.log('!!!! CORRUPTED: Contains "blob:" (valid only on local browser) !!!');
                    }
                }
            } else {
                console.log(`\nNo item found with title matching ${title}`);
            }
        }
        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e);
        process.exit(1);
    }
}
check();
