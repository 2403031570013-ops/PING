const express = require('express');
const router = express.Router();
const CallLog = require('../models/CallLog');
const verifyToken = require('../middleware/authMiddleware');

// 1. Log a New Call
router.post('/', verifyToken, async (req, res) => {
    try {
        const { receiverId, status, duration = 0, type = 'voice', startTime, endTime } = req.body;

        const newCall = new CallLog({
            caller: req.user.userId, // From JWT payload
            receiver: receiverId,
            status,
            type,
            duration,
            startTime: startTime || Date.now(),
            endTime: endTime
        });

        await newCall.save();
        res.status(201).json(newCall);

    } catch (err) {
        console.error("Error logging call:", err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// 2. Get Call History (Combined Caller & Receiver)
router.get('/', verifyToken, async (req, res) => {
    try {
        // Find calls where I am caller OR receiver
        const calls = await CallLog.find({
            $or: [
                { caller: req.user.userId },
                { receiver: req.user.userId }
            ]
        })
            .populate('caller', 'fullName email photoURL phone')
            .populate('receiver', 'fullName email photoURL phone')
            .sort({ createdAt: -1 }); // Newest first

        res.json(calls);
    } catch (err) {
        console.error("Error fetching calls:", err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
