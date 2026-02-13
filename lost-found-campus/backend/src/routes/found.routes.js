const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const FoundItem = require("../models/FoundItem");
const LostItem = require("../models/LostItem");
const User = require("../models/User");
const { Expo } = require("expo-server-sdk");
const expo = new Expo();
const verifyToken = require('../middleware/authMiddleware');

router.post("/", verifyToken, async (req, res) => {
    try {
        const item = new FoundItem({
            ...req.body,
            postedBy: req.user.userId
        });
        await item.save();
        const populatedItem = await item.populate('postedBy', 'fullName photoURL email');

        const { findAndNotifyMatches } = require("../utils/matcher");
        // Trigger Smart Matcher (Async)
        setTimeout(() => findAndNotifyMatches(item, 'found'), 0);

        res.status(201).json(populatedItem);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.get("/", async (req, res) => {
    try {
        const { campusId, status, postedBy } = req.query;
        let query = {};

        if (campusId && mongoose.Types.ObjectId.isValid(campusId)) {
            query.campusId = campusId;
        }

        if (postedBy) {
            const cleanId = postedBy.replace('postedBy:', '');
            if (mongoose.Types.ObjectId.isValid(cleanId)) {
                query.postedBy = cleanId;
            }
        }

        if (req.query.resolvedBy && mongoose.Types.ObjectId.isValid(req.query.resolvedBy)) {
            query.resolvedBy = req.query.resolvedBy;
        }

        // Default: only active
        if (status === 'all') {
            // no filter
        } else if (status) {
            query.status = status;
        } else {
            query.status = 'active';
            // Also filter out expired items
            query.expiresAt = { $gt: new Date() };
        }

        const items = await FoundItem.find(query)
            .populate('postedBy', 'fullName photoURL email phone role')
            .sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Mark Found Item as Returned (Resolved)
router.put("/:id/resolve", verifyToken, async (req, res) => {
    try {
        const item = await FoundItem.findOne({ _id: req.params.id, postedBy: req.user.userId });
        if (!item) {
            return res.status(404).json({ error: "Item not found or unauthorized" });
        }
        item.status = 'resolved';
        if (req.body.resolvedBy) {
            item.resolvedBy = req.body.resolvedBy;
        }
        await item.save();

        // Award small karma for manual cleanup
        await User.findByIdAndUpdate(req.user.userId, { $inc: { karmaPoints: 10 } });

        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete("/:id", verifyToken, async (req, res) => {
    try {
        const item = await FoundItem.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        // Authorization: Poster or Admin only
        if (item.postedBy.toString() !== req.user.userId && req.dbUser.role !== 'admin') {
            return res.status(403).json({ error: "Unauthorized: You can only delete your own items." });
        }

        await item.deleteOne();
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
