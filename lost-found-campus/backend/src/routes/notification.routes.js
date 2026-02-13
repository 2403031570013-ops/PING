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

// Get Unread Count
router.get('/unread-count', verifyToken, async (req, res) => {
    try {
        const count = await Notification.countDocuments({ userId: req.dbUser._id, read: false });
        console.log(`🔔 Unread Notifications for ${req.dbUser.email}: ${count}`);
        res.json({ count });
    } catch (err) {
        console.error("Error getting notification count:", err);
        res.status(500).json({ error: err.message });
    }
});

const mongoose = require('mongoose');

// Mark as Read
router.put('/:id/read', verifyToken, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid notification ID" });
        }

        const notification = await Notification.findOne({ _id: req.params.id, userId: req.dbUser._id });
        if (!notification) {
            return res.status(404).json({ message: "Notification not found or access denied" });
        }

        notification.read = true;
        await notification.save();
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
