const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { Expo } = require("expo-server-sdk");
const expo = new Expo();

const findAndNotifyMatches = async (newItem, type) => {
    try {
        const TargetModel = type === 'lost' ? FoundItem : LostItem;
        const targetType = type === 'lost' ? 'found' : 'lost';

        // 1. Basic Matching Logic: Same Campus + Same Category
        // + Fuzzy Title Match (Case insensitive regex)
        // Simplification: Check if title words exist in description or title

        const searchTerms = newItem.title.split(' ').filter(w => w.length > 3).map(w => new RegExp(w, 'i'));

        if (searchTerms.length === 0) return; // Title too short

        const matches = await TargetModel.find({
            campusId: newItem.campusId,
            category: newItem.category,
            status: 'active',
            $or: [
                { title: { $in: searchTerms } },
                { description: { $in: searchTerms } }
            ]
        }).populate('postedBy');

        console.log(`[Matcher] Found ${matches.length} matches for new ${type} item: ${newItem.title}`);

        // 2. Notify Users
        for (const match of matches) {
            // Who to notify? 
            // If I just posted "Lost iPhone", notify the guy who posted "Found iPhone" (match).
            // AND notify ME that a match exists?
            // Usually, notify the person who created the OLDER post that a NEW match was found.

            // Scenario A: I post LOST iPhone. System finds existing FOUND iPhone.
            // Notify ME (New Poster): "We found a potential match!"
            // Notify HIM (Old Poster): "Someone just posted a matching Lost Item!"

            // Notify New Poster (newItem.postedBy)
            await Notification.create({
                userId: newItem.postedBy,
                title: "Potential Match Found! 🎯",
                message: `We found a '${match.title}' that matches your post. Check it out!`,
                type: 'info',
                data: { itemId: match._id, itemType: targetType }
            });

            // Notify Old Poster (match.postedBy)
            await Notification.create({
                userId: match.postedBy._id,
                title: "New Match for your Item! 🎯",
                message: `A new '${newItem.title}' was posted that matches your item.`,
                type: 'info',
                data: { itemId: newItem._id, itemType: type }
            });

            // Push Notifications (Best Effort)
            // ... (Skipping verbose push logic for speed, Notifications schema handles in-app)
        }

    } catch (error) {
        console.error("[Matcher] Error:", error);
    }
};

module.exports = { findAndNotifyMatches };
