const express = require('express');
const router = express.Router();
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');

// GET /api/items - Unified view for Map & Analytics
router.get('/', async (req, res) => {
    try {
        const { status = 'active', campusId, category } = req.query;
        let query = {};
        if (status !== 'all') query.status = status;
        if (campusId) query.campusId = campusId;
        if (category && category !== 'All') query.category = category;

        const [lost, found] = await Promise.all([
            LostItem.find(query).populate('postedBy', 'fullName photoURL').sort({ createdAt: -1 }),
            FoundItem.find(query).populate('postedBy', 'fullName photoURL').sort({ createdAt: -1 })
        ]);

        const items = [
            ...lost.map(i => ({ ...i.toJSON(), type: 'lost' })),
            ...found.map(i => ({ ...i.toJSON(), type: 'found' }))
        ];

        res.json(items);
    } catch (err) {
        console.error("Unified items fetch failed:", err.message);
        res.status(500).json({ message: "Failed to fetch items." });
    }
});

module.exports = router;
