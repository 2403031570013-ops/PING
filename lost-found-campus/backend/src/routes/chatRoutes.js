const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');
const { Expo } = require("expo-server-sdk");
const expo = new Expo();
const verifyToken = require('../middleware/authMiddleware');

// POST /api/chat - Create or Get Chat
router.post('/', verifyToken, async (req, res) => {
    try {
        const { itemId, otherUserId, itemType } = req.body;

        // 1. Validate Request Body / Params
        if (!otherUserId) {
            console.error("❌ Missing otherUserId in request body");
            return res.status(400).json({ error: "Missing required field: otherUserId" });
        }

        const currentId = req.dbUser._id;

        // Ensure valid ObjectIds for users
        if (!mongoose.isValidObjectId(otherUserId) || !mongoose.isValidObjectId(currentId)) {
            console.error("❌ Invalid User IDs");
            return res.status(400).json({ error: "Invalid User ID format" });
        }

        // Get CampusId from logged-in user (assuming users chat within same campus context)
        // If frontend sends it, use it; otherwise use user's campus
        let campusId = req.body.campusId || req.dbUser.campusId;

        // Handle populated campusId object
        if (campusId && typeof campusId === 'object' && campusId._id) {
            campusId = campusId._id;
        }

        if (!campusId) {
            console.error("❌ Missing campusId");
            return res.status(400).json({ error: "Missing required field: campusId" });
        }

        // 2. Logic to find existing chat using campusId + members
        // We use $all to match both users regardless of order
        let chat = await Chat.findOne({
            campusId: campusId,
            members: { $all: [currentId, otherUserId] }
        })
            .populate('members', 'fullName photoURL email phone')
            .populate('campusId', 'name');

        if (!chat) {
            console.log("ℹ️ Chat not found, creating new one...");

            // 3. Create chat if it does not exist
            chat = new Chat({
                campusId: campusId,
                members: [currentId, otherUserId],
                messages: [],
                itemId: itemId || null,     // Optional context
                itemType: itemType || null  // Optional context
            });

            await chat.save();

            // Populate for return
            chat = await Chat.findById(chat._id)
                .populate('members', 'fullName photoURL email phone')
                .populate('campusId', 'name');

            console.log(`✅ New Chat created: ${chat._id}`);
        } else {
            console.log(`✅ Existing Chat found: ${chat._id}`);
        }

        // 4. Return clean JSON
        res.status(200).json(chat);

    } catch (err) {
        // 5. Add console.error logging so backend errors are visible
        console.error("🔥 Error in POST /api/chat:", err);
        res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
});

// GET /api/chat - Get User Chats
router.get('/', verifyToken, async (req, res) => {
    try {
        const chats = await Chat.find({ members: req.dbUser._id })
            .populate('members', 'fullName photoURL email phone')
            .sort({ updatedAt: -1 });
        res.json(chats);
    } catch (err) {
        console.error("Error fetching chats:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/chat/:chatId - Get Single Chat
router.get('/:chatId', verifyToken, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId)
            .populate('members', 'fullName photoURL email phone');
        if (!chat) return res.status(404).json({ error: "Chat not found" });
        res.json(chat);
    } catch (err) {
        console.error("Error fetching chat:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/chat/:chatId/message - Send Message
router.post('/:chatId/message', verifyToken, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: "Message text required" });

        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ error: "Chat not found" });

        const newMessage = {
            senderId: req.dbUser._id,
            text,
            createdAt: new Date()
        };

        chat.messages.push(newMessage);
        chat.lastMessage = text;
        chat.updatedAt = new Date(); // Update timestamp
        await chat.save();

        console.log(`📩 Message sent in chat ${chat._id}`);

        // Push Notification Logic
        try {
            const recipientId = chat.members.find(m => m.toString() !== req.dbUser._id.toString());
            if (recipientId) {
                const recipient = await User.findById(recipientId);
                if (recipient?.pushToken && Expo.isExpoPushToken(recipient.pushToken)) {
                    await expo.sendPushNotificationsAsync([{
                        to: recipient.pushToken,
                        title: `Message from ${req.dbUser.fullName}`,
                        body: text,
                        data: { chatId: chat._id }
                    }]);
                }
            }
        } catch (pushErr) {
            console.error("⚠️ Push notification failed:", pushErr);
            // Don't fail the request if push fails
        }

        res.json(chat);

    } catch (err) {
        console.error("🔥 Error sending message:", err);
        res.status(500).json({ error: err.message });
    }
});

const mongoose = require('mongoose'); // Needed for isValidObjectId check

module.exports = router;
