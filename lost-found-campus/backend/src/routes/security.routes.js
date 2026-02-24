const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { findAndNotifyMatches } = require('../utils/matcher');

// Security Desk Quick Log
router.post('/quick-log', authMiddleware, requireRole('staff', 'admin'), async (req, res) => {
    try {
        const { title, description, location, category, image, storedAt, notifyUserId } = req.body;

        const campusId = req.user.campusId?._id || req.user.campusId;

        const newItem = await FoundItem.create({
            title: title || "Item found by Security",
            description: description || "Logged at Security Desk",
            location: location || "Security Main Gate",
            category: category || "Others",
            image: image || null,
            postedBy: req.user._id,
            campusId,
            storedAt: storedAt || "Security Desk",
            status: 'active'
        });

        // If a specific student was identified, notify them directly
        if (notifyUserId) {
            const notif = await Notification.create({
                userId: notifyUserId,
                title: "Official Security Update! 👮‍♂️",
                message: `The Security Desk has logged your '${title}'. Please collect it from ${location || 'Security Desk'}.`,
                type: 'security',
                data: { itemId: newItem._id, itemType: 'found' }
            });

            // Real-time notification via Socket.io
            const io = req.app.get('io');
            if (io) {
                io.to(notifyUserId).emit('new-notification', notif);
            }

            // Push Notification
            try {
                const { Expo } = require('expo-server-sdk');
                const expo = new Expo();
                const targetUser = await User.findById(notifyUserId);
                if (targetUser?.pushToken && Expo.isExpoPushToken(targetUser.pushToken)) {
                    await expo.sendPushNotificationsAsync([{
                        to: targetUser.pushToken,
                        title: "Official Security Update! 👮‍♂️",
                        body: `We found your ${title}. Visit the Security Desk to collect it.`,
                        data: { type: 'notification', id: notif._id }
                    }]);
                }
            } catch (pushErr) {
                console.error("[Security] Push Error:", pushErr.message);
            }
        }

        // Trigger Smart Matcher
        findAndNotifyMatches(newItem, 'found').catch(err =>
            console.error('Match error:', err.message)
        );

        // Award karma for security logging
        await User.findByIdAndUpdate(req.user._id, { $inc: { karmaPoints: 5 } });

        const populatedItem = await FoundItem.findById(newItem._id)
            .populate('postedBy', 'fullName photoURL email');
        res.status(201).json(populatedItem);

    } catch (err) {
        console.error('Security Quick Log Error:', err.message);
        res.status(500).json({ message: "Failed to log item." });
    }
});

module.exports = router;
