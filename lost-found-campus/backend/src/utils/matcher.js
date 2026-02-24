const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Notification = require('../models/Notification');
const { calculateMatchScore, extractKeywords } = require('./aiService');

/**
 * Smart Matching Engine
 * When a new item is posted (lost or found), find potential matches from
 * the opposite type and notify both parties.
 */
const findAndNotifyMatches = async (newItem, itemType) => {
    try {
        const isLost = itemType === 'lost' || itemType === 'LostItem';
        const OppositeModel = isLost ? FoundItem : LostItem;

        // Find candidate items from the same campus, same category, and active
        const candidates = await OppositeModel.find({
            campusId: newItem.campusId,
            status: 'active',
        })
            .populate('postedBy', 'fullName')
            .sort({ createdAt: -1 })
            .limit(50);

        if (candidates.length === 0) return [];

        // Score all candidates
        const matches = [];
        for (const candidate of candidates) {
            // Skip items by the same user
            if (candidate.postedBy?._id?.toString() === newItem.postedBy?.toString()) continue;

            const { score, factors } = calculateMatchScore(newItem, candidate);

            if (score >= 25) { // Minimum threshold for notification
                matches.push({
                    item: candidate,
                    score,
                    factors
                });
            }
        }

        // Sort by score descending
        matches.sort((a, b) => b.score - a.score);

        // Take top 5 matches
        const topMatches = matches.slice(0, 5);

        // Create notifications for both parties
        const notifications = [];
        for (const match of topMatches) {
            const matchedItem = match.item;
            const matchPercentage = match.score;

            // Notification for the new item poster
            notifications.push(
                Notification.create({
                    userId: newItem.postedBy,
                    title: `🎯 Potential Match Found! (${matchPercentage}%)`,
                    message: `A ${isLost ? 'found' : 'lost'} item "${matchedItem.title}" at ${matchedItem.location || 'campus'} might be related to your ${isLost ? 'lost' : 'found'} item "${newItem.title}". Tap to view details.`,
                    type: 'match',
                    data: {
                        itemId: matchedItem._id,
                        itemType: isLost ? 'found' : 'lost',
                        matchScore: matchPercentage,
                        factors: match.factors
                    }
                })
            );

            // Notification for the matched item poster
            notifications.push(
                Notification.create({
                    userId: matchedItem.postedBy._id || matchedItem.postedBy,
                    title: `🎯 Possible Match! (${matchPercentage}%)`,
                    message: `A new ${isLost ? 'lost' : 'found'} item "${newItem.title}" might match your ${isLost ? 'found' : 'lost'} item "${matchedItem.title}". Check it out!`,
                    type: 'match',
                    data: {
                        itemId: newItem._id,
                        itemType: isLost ? 'lost' : 'found',
                        matchScore: matchPercentage,
                        factors: match.factors
                    }
                })
            );
        }

        await Promise.all(notifications);

        console.log(`✅ Smart Matching: Found ${topMatches.length} potential matches for "${newItem.title}" (best: ${topMatches[0]?.score || 0}%)`);
        return topMatches;

    } catch (err) {
        console.error('❌ Matching Error:', err.message);
        return [];
    }
};

module.exports = { findAndNotifyMatches };
