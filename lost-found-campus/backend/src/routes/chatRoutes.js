const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');
const mongoose = require('mongoose');
const { Expo } = require("expo-server-sdk");
const expo = new Expo();
const { authMiddleware } = require('../middleware/authMiddleware');
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
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { itemId, otherUserId, itemType } = req.body;

        if (!otherUserId) {
            return res.status(400).json({ message: "Missing required field: otherUserId" });
        }

        const currentId = req.user._id;

        if (!mongoose.isValidObjectId(otherUserId) || !mongoose.isValidObjectId(currentId)) {
            return res.status(400).json({ message: "Invalid User ID format" });
        }

        let campusId = req.body.campusId || req.user.campusId;
        if (campusId && typeof campusId === 'object' && campusId._id) {
            campusId = campusId._id;
        }

        // Search for existing chat between these members
        const query = {
            members: { $all: [currentId, otherUserId] }
        };
        if (campusId) query.campusId = campusId;

        let chat = await Chat.findOne(query)
            .populate('members', 'fullName photoURL email phone')
            .populate('campusId', 'name');

        if (!chat) {
            chat = new Chat({
                campusId: campusId,
                members: [currentId, otherUserId],
                messages: [],
                itemId: itemId || null,
                itemType: itemType || null
            });

            await chat.save();

            chat = await Chat.findById(chat._id)
                .populate('members', 'fullName photoURL email phone')
                .populate('campusId', 'name');
        }

        res.status(200).json(chat);

    } catch (err) {
        console.error("Error in POST /api/chat:", err.message);
        res.status(500).json({ message: "Failed to create or get chat." });
    }
});

// GET /api/chat - Get User Chats
router.get('/', authMiddleware, async (req, res) => {
    try {
        const chats = await Chat.find({ members: req.user._id })
            .populate('members', 'fullName photoURL email phone')
            .sort({ updatedAt: -1 })
            .lean();
        res.json(chats);
    } catch (err) {
        console.error("Error fetching chats:", err.message);
        res.status(500).json({ message: "Failed to fetch chats." });
    }
});

// GET /api/chat/unread-total
router.get('/unread-total', authMiddleware, async (req, res) => {
    try {
        const chats = await Chat.find({ members: req.user._id });
        let totalUnread = 0;

        chats.forEach(chat => {
            const counts = chat.unreadCounts;
            if (counts) {
                if (typeof counts.get === 'function') {
                    totalUnread += (counts.get(req.user._id.toString()) || 0);
                } else {
                    totalUnread += (counts[req.user._id.toString()] || 0);
                }
            }
        });

        res.json({ totalUnread });
    } catch (err) {
        console.error("Error getting unread total:", err.message);
        res.status(500).json({ message: "Failed to get unread count." });
    }
});

// GET /api/chat/:chatId
router.get('/:chatId', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.chatId)) {
            return res.status(400).json({ message: "Invalid Chat ID format" });
        }

        const chat = await Chat.findOne({ _id: req.params.chatId, members: req.user._id })
            .populate('members', 'fullName photoURL email phone')
            .lean();
        if (!chat) return res.status(404).json({ message: "Chat not found or access denied" });
        res.json(chat);
    } catch (err) {
        console.error("Error fetching chat:", err.message);
        res.status(500).json({ message: "Failed to fetch chat." });
    }
});

// POST /api/chat/:chatId/message
router.post('/:chatId/message', authMiddleware, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), async (req, res) => {
    try {
        const { text } = req.body;
        const imageURL = (req.files && req.files['image']) ? `/uploads/chat/${req.files['image'][0].filename}` : null;
        const audioURL = (req.files && req.files['audio']) ? `/uploads/chat/${req.files['audio'][0].filename}` : null;

        if (!text && !imageURL && !audioURL) return res.status(400).json({ message: "Message content required" });

        if (!mongoose.isValidObjectId(req.params.chatId)) {
            return res.status(400).json({ message: "Invalid Chat ID format" });
        }

        const chat = await Chat.findOne({ _id: req.params.chatId, members: req.user._id });
        if (!chat) return res.status(404).json({ message: "Chat not found or access denied" });

        const newMessage = {
            senderId: req.user._id,
            text,
            imageURL,
            audioURL,
            createdAt: new Date()
        };

        chat.messages.push(newMessage);
        chat.lastMessage = text || (imageURL ? "Shared a photo" : "Shared a voice note");
        chat.lastMessageSenderId = req.user._id;
        chat.updatedAt = new Date();

        // Increment unread counts for recipient(s)
        if (!chat.unreadCounts) {
            chat.unreadCounts = new Map();
        }
        chat.members.forEach(memberId => {
            if (memberId.toString() !== req.user._id.toString()) {
                const currentCount = chat.unreadCounts.get(memberId.toString()) || 0;
                chat.unreadCounts.set(memberId.toString(), currentCount + 1);
            }
        });

        chat.markModified('unreadCounts');
        await chat.save();

        // Real-time Socket.io Emit
        const io = req.app.get('io');
        const users = req.app.get('users');
        if (io && users) {
            chat.members.forEach(memberId => {
                const userIdStr = memberId.toString();
                if (userIdStr !== req.user._id.toString()) {
                    const socketId = users[userIdStr];
                    if (socketId) {
                        io.to(socketId).emit('new-message', {
                            chatId: chat._id,
                            message: chat.messages[chat.messages.length - 1]
                        });
                    }
                }
            });
        }

        // Push Notification
        try {
            const recipientId = chat.members.find(m => m.toString() !== req.user._id.toString());
            if (recipientId) {
                const recipient = await User.findById(recipientId);
                if (recipient?.pushToken && Expo.isExpoPushToken(recipient.pushToken)) {
                    await expo.sendPushNotificationsAsync([{
                        to: recipient.pushToken,
                        title: `Message from ${req.user.fullName}`,
                        body: text || "New message",
                        data: { chatId: chat._id }
                    }]);
                }
            }
        } catch (pushErr) {
            console.error("Push notification failed:", pushErr.message);
        }

        res.json(chat);

    } catch (err) {
        console.error("Error sending message:", err.message);
        res.status(500).json({ message: "Failed to send message." });
    }
});

// PATCH /api/chat/:chatId/read
router.patch('/:chatId/read', authMiddleware, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.chatId)) {
            return res.status(400).json({ message: "Invalid Chat ID format" });
        }

        const chat = await Chat.findOne({ _id: req.params.chatId, members: req.user._id });
        if (!chat) return res.status(404).json({ message: "Chat not found or access denied" });

        if (!chat.unreadCounts) {
            chat.unreadCounts = new Map();
        }
        chat.unreadCounts.set(req.user._id.toString(), 0);
        chat.markModified('unreadCounts');
        await chat.save();

        res.json({ message: "Read status updated" });
    } catch (err) {
        console.error("Error marking chat as read:", err.message);
        res.status(500).json({ message: "Failed to update read status." });
    }
});

module.exports = router;
