const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const verifyToken = require('../middleware/authMiddleware');

// Get My Notifications
router.get('/', verifyToken, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.dbUser._id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark as Read
router.put('/:id/read', verifyToken, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { read: true });
        res.json({ message: "Read" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark All as Read
router.put('/read-all', verifyToken, async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.dbUser._id, read: false }, { read: true });
        res.json({ message: "All Read" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
