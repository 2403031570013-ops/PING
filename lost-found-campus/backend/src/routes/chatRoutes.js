const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');
const mongoose = require('mongoose');
const { Expo } = require("expo-server-sdk");
const expo = new Expo();
const verifyToken = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', '..', 'uploads', 'chat');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `chat_${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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
            .sort({ updatedAt: -1 })
            .lean();
        res.json(chats);
    } catch (err) {
        console.error("Error fetching chats:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/chat/unread-total - Get total unread messages count across all chats
router.get('/unread-total', verifyToken, async (req, res) => {
    try {
        const chats = await Chat.find({ members: req.dbUser._id });
        let totalUnread = 0;

        chats.forEach(chat => {
            const counts = chat.unreadCounts;
            if (counts) {
                if (typeof counts.get === 'function') {
                    totalUnread += (counts.get(req.dbUser._id.toString()) || 0);
                } else {
                    totalUnread += (counts[req.dbUser._id.toString()] || 0);
                }
            }
        });

        res.json({ totalUnread });
    } catch (err) {
        console.error("Error getting unread total:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/chat/:chatId - Get Single Chat
router.get('/:chatId', verifyToken, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.chatId)) {
            return res.status(400).json({ error: "Invalid Chat ID format" });
        }

        const chat = await Chat.findOne({ _id: req.params.chatId, members: req.dbUser._id })
            .populate('members', 'fullName photoURL email phone')
            .lean();
        if (!chat) return res.status(404).json({ error: "Chat not found or access denied" });
        res.json(chat);
    } catch (err) {
        console.error("Error fetching chat:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/:chatId/message', verifyToken, upload.single('image'), async (req, res) => {
    console.log("--- DEBUG CHAT MESSAGE ---");
    console.log("Method:", req.method);
    console.log("ChatId:", req.params.chatId);
    console.log("Body Keys:", Object.keys(req.body));
    console.log("File:", req.file ? req.file.originalname : "No file");
    console.log("--------------------------");
    try {
        const { text } = req.body;
        const imageURL = req.file ? `/uploads/chat/${req.file.filename}` : null;

        if (!text && !imageURL) return res.status(400).json({ error: "Message text or image required" });

        if (!mongoose.isValidObjectId(req.params.chatId)) {
            return res.status(400).json({ error: "Invalid Chat ID format" });
        }

        const chat = await Chat.findOne({ _id: req.params.chatId, members: req.dbUser._id });
        if (!chat) return res.status(404).json({ error: "Chat not found or access denied" });

        const newMessage = {
            senderId: req.dbUser._id,
            text,
            imageURL,
            createdAt: new Date()
        };

        chat.messages.push(newMessage);
        chat.lastMessage = text || "Shared a photo";
        chat.lastMessageSenderId = req.dbUser._id;
        chat.updatedAt = new Date();

        // Increment unread counts for recipient(s)
        if (!chat.unreadCounts) {
            chat.unreadCounts = new Map();
        }
        chat.members.forEach(memberId => {
            if (memberId.toString() !== req.dbUser._id.toString()) {
                const currentCount = chat.unreadCounts.get(memberId.toString()) || 0;
                chat.unreadCounts.set(memberId.toString(), currentCount + 1);
            }
        });

        chat.markModified('unreadCounts');
        await chat.save();

        console.log(`📩 Message sent in chat ${chat._id}`);

        // Real-time Socket.io Emit
        const io = req.app.get('io');
        const users = req.app.get('users');
        if (io && users) {
            chat.members.forEach(memberId => {
                const userIdStr = memberId.toString();
                if (userIdStr !== req.dbUser._id.toString()) {
                    const socketId = users[userIdStr];
                    if (socketId) {
                        console.log(`📡 Emitting new-message to user ${userIdStr} (socket ${socketId})`);
                        io.to(socketId).emit('new-message', {
                            chatId: chat._id,
                            message: chat.messages[chat.messages.length - 1]
                        });
                    }
                }
            });
        }

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

// PATCH /api/chat/:chatId/read - Mark Chat as Read
router.patch('/:chatId/read', verifyToken, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.chatId)) {
            return res.status(400).json({ error: "Invalid Chat ID format" });
        }

        const chat = await Chat.findOne({ _id: req.params.chatId, members: req.dbUser._id });
        if (!chat) return res.status(404).json({ error: "Chat not found or access denied" });

        // Reset count for current user
        if (!chat.unreadCounts) {
            chat.unreadCounts = new Map();
        }
        chat.unreadCounts.set(req.dbUser._id.toString(), 0);
        chat.markModified('unreadCounts');
        await chat.save();

        res.json({ message: "Read status updated" });
    } catch (err) {
        console.error("Error marking chat as read:", err);
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
