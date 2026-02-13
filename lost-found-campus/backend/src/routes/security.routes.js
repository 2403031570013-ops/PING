const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const User = require('../models/User');

// Security Desk Dashboard
// Allow security guards (role='staff' or 'admin') to quickly log founded items
router.post('/quick-log', verifyToken, async (req, res) => {
    try {
        if (req.dbUser.role !== 'staff' && req.dbUser.role !== 'admin') {
            return res.status(403).json({ message: "Access denied. Security Personnel Only." });
        }

        const { title, description, location, category, image, notifyUserId } = req.body;

        const newItem = new FoundItem({
            title: title || "Item found by Security",
            description: description || "Logged at Security Desk",
            location: location || "Security Main Gate",
            category: category || "Others",
            image: image,
            postedBy: req.dbUser._id,
            campusId: req.dbUser.campusId,
            isHighValue: true,
            status: 'active'
        });

        await newItem.save();

        // If a specific student was identified (via ID Card Scan), notify them directly
        if (notifyUserId) {
            const Notification = require('../models/Notification');
            const { Expo } = require('expo-server-sdk');
            const expo = new Expo();

            const notif = await Notification.create({
                userId: notifyUserId,
                title: "Official Security Update! 👮‍♂️",
                message: `The Security Desk has logged your '${title}'. Please collect it from ${location}.`,
                type: 'success',
                data: { itemId: newItem._id, itemType: 'found' }
            });

            // 1. Instant Real-time Notification via Socket.io
            const io = req.app.get('io');
            const users = req.app.get('users');
            const targetSocketId = users ? users[notifyUserId] : null;

            if (io && targetSocketId) {
                io.to(targetSocketId).emit('new-notification', notif);
                console.log(`[Security] Real-time socket alert sent to ${notifyUserId}`);
            }

            // 2. Push Notification via Expo
            try {
                const targetUser = await User.findById(notifyUserId);
                if (targetUser?.pushToken && Expo.isExpoPushToken(targetUser.pushToken)) {
                    await expo.sendPushNotificationsAsync([{
                        to: targetUser.pushToken,
                        title: "Official Security Update! 👮‍♂️",
                        body: `We found your ${title}. Visit the Security Desk to collect it.`,
                        data: { type: 'notification', id: notif._id }
                    }]);
                    console.log(`[Security] Push notification sent to ${notifyUserId}`);
                }
            } catch (pushErr) {
                console.error("[Security] Push Error:", pushErr.message);
            }

            console.log(`[Security] Direct notification created in DB for: ${notifyUserId}`);
        }

        const { findAndNotifyMatches } = require("../utils/matcher");
        // Trigger Smart Matcher (Async) - This scans all 'Lost' reports for matches
        setTimeout(() => findAndNotifyMatches(newItem, 'found'), 0);

        const populatedItem = await newItem.populate('postedBy', 'fullName photoURL email');
        res.status(201).json(populatedItem);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
