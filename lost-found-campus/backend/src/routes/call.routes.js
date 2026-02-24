const express = require('express');
const router = express.Router();
const CallLog = require('../models/CallLog');
const { authMiddleware } = require('../middleware/authMiddleware');

// Log a New Call
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { receiverId, status, duration = 0, type = 'voice', startTime, endTime } = req.body;

        const newCall = new CallLog({
            caller: req.user._id,
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
        console.error("Error logging call:", err.message);
        res.status(500).json({ message: 'Failed to log call.' });
    }
});

// Get Call History
router.get('/', authMiddleware, async (req, res) => {
    try {
        const calls = await CallLog.find({
            $or: [
                { caller: req.user._id },
                { receiver: req.user._id }
            ]
        })
            .populate('caller', 'fullName email photoURL phone')
            .populate('receiver', 'fullName email photoURL phone')
            .sort({ createdAt: -1 });

        res.json(calls);
    } catch (err) {
        console.error("Error fetching calls:", err.message);
        res.status(500).json({ message: 'Failed to fetch call history.' });
    }
});

module.exports = router;
