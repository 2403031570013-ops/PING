const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/authMiddleware');

// ============================================================
// GET USER NOTIFICATIONS
// ============================================================

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 50, type } = req.query;

        const filter = { userId: req.user._id };
        if (type) filter.type = type;

        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        res.json(notifications);

    } catch (err) {
        console.error('Get Notifications Error:', err.message);
        res.status(500).json({ message: 'Failed to fetch notifications.' });
    }
});

// ============================================================
// GET UNREAD COUNT
// ============================================================

router.get('/unread-count', authMiddleware, async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            userId: req.user._id,
            read: false
        });

        res.json({ count });

    } catch (err) {
        console.error('Unread Count Error:', err.message);
        res.status(500).json({ message: 'Failed to get unread count.' });
    }
});

// ============================================================
// MARK SINGLE AS READ (support both PUT and PATCH)
// ============================================================

const markOneRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found.' });
        }

        res.json(notification);

    } catch (err) {
        console.error('Mark Read Error:', err.message);
        res.status(500).json({ message: 'Failed to update notification.' });
    }
};

router.patch('/:id/read', authMiddleware, markOneRead);
router.put('/:id/read', authMiddleware, markOneRead);

// ============================================================
// MARK ALL AS READ (support multiple path patterns)
// ============================================================

const markAllRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, read: false },
            { read: true }
        );

        res.json({ message: 'All notifications marked as read.' });

    } catch (err) {
        console.error('Mark All Read Error:', err.message);
        res.status(500).json({ message: 'Failed to update notifications.' });
    }
};

router.patch('/mark-all-read', authMiddleware, markAllRead);
router.put('/read-all', authMiddleware, markAllRead);

// ============================================================
// DELETE SINGLE NOTIFICATION
// ============================================================

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found.' });
        }

        res.json({ message: 'Notification deleted.' });

    } catch (err) {
        console.error('Delete Notification Error:', err.message);
        res.status(500).json({ message: 'Failed to delete notification.' });
    }
});

// ============================================================
// DELETE ALL NOTIFICATIONS
// ============================================================

router.delete('/', authMiddleware, async (req, res) => {
    try {
        await Notification.deleteMany({ userId: req.user._id });
        res.json({ message: 'All notifications deleted.' });

    } catch (err) {
        console.error('Delete All Error:', err.message);
        res.status(500).json({ message: 'Failed to delete notifications.' });
    }
});

module.exports = router;
