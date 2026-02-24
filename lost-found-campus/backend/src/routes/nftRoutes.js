const express = require('express');
const router = express.Router();
const NftBadge = require('../models/NftBadge');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/authMiddleware');

// ============================================================
// GET MY NFT BADGES
// ============================================================

router.get('/my-badges', authMiddleware, async (req, res) => {
    try {
        const badges = await NftBadge.find({ ownerId: req.user._id })
            .sort({ awardedAt: -1 });

        res.json({
            totalBadges: badges.length,
            badges
        });

    } catch (err) {
        console.error('My Badges Error:', err);
        res.status(500).json({ message: 'Failed to fetch badges.' });
    }
});

// ============================================================
// GET USER'S NFT GALLERY (PUBLIC)
// ============================================================

router.get('/gallery/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select('fullName photoURL karmaPoints');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const badges = await NftBadge.find({ ownerId: userId, status: 'minted' })
            .sort({ awardedAt: -1 });

        // Group by tier
        const byTier = {
            legendary: badges.filter(b => b.tier === 'legendary'),
            platinum: badges.filter(b => b.tier === 'platinum'),
            gold: badges.filter(b => b.tier === 'gold'),
            silver: badges.filter(b => b.tier === 'silver'),
            bronze: badges.filter(b => b.tier === 'bronze'),
        };

        res.json({
            user: {
                _id: user._id,
                fullName: user.fullName,
                photoURL: user.photoURL,
                karmaPoints: user.karmaPoints
            },
            totalBadges: badges.length,
            byTier,
            badges
        });

    } catch (err) {
        console.error('NFT Gallery Error:', err);
        res.status(500).json({ message: 'Failed to fetch NFT gallery.' });
    }
});

// ============================================================
// GET BADGE CATALOG
// ============================================================

router.get('/catalog', authMiddleware, (req, res) => {
    try {
        const catalog = NftBadge.BADGE_CATALOG;

        const badges = Object.entries(catalog).map(([key, badge]) => ({
            id: key,
            ...badge
        }));

        res.json(badges);

    } catch (err) {
        console.error('Badge Catalog Error:', err);
        res.status(500).json({ message: 'Failed to fetch catalog.' });
    }
});

// ============================================================
// GET BADGE DETAILS
// ============================================================

router.get('/:badgeId', authMiddleware, async (req, res) => {
    try {
        const badge = await NftBadge.findOne({ badgeId: req.params.badgeId })
            .populate('ownerId', 'fullName photoURL karmaPoints');

        if (!badge) {
            return res.status(404).json({ message: 'Badge not found.' });
        }

        res.json(badge);

    } catch (err) {
        console.error('Badge Details Error:', err);
        res.status(500).json({ message: 'Failed to fetch badge details.' });
    }
});

// ============================================================
// CAMPUS LEADERBOARD BY BADGES
// ============================================================

router.get('/leaderboard/campus', authMiddleware, async (req, res) => {
    try {
        const campusId = req.user.campusId?._id || req.user.campusId;

        const pipeline = [
            { $match: { status: 'minted', ...(campusId ? { campusId } : {}) } },
            { $group: { _id: '$ownerId', badgeCount: { $sum: 1 }, tiers: { $push: '$tier' } } },
            { $sort: { badgeCount: -1 } },
            { $limit: 20 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            {
                $project: {
                    _id: '$user._id',
                    fullName: '$user.fullName',
                    photoURL: '$user.photoURL',
                    karmaPoints: '$user.karmaPoints',
                    badgeCount: 1,
                    goldBadges: {
                        $size: {
                            $filter: { input: '$tiers', as: 't', cond: { $in: ['$$t', ['gold', 'platinum', 'legendary']] } }
                        }
                    }
                }
            }
        ];

        const leaders = await NftBadge.aggregate(pipeline);

        res.json(leaders.map((l, i) => ({ rank: i + 1, ...l })));

    } catch (err) {
        console.error('NFT Leaderboard Error:', err);
        res.status(500).json({ message: 'Failed to fetch leaderboard.' });
    }
});

module.exports = router;
