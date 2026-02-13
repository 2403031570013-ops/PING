const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const LostItem = require("../models/LostItem");
const User = require("../models/User");
const verifyToken = require('../middleware/authMiddleware');
const NodeCache = require('node-cache');

const { findAndNotifyMatches } = require("../utils/matcher");

// Initialize Cache (stdTTL: 60 seconds)
const cache = new NodeCache({ stdTTL: 60 });

// POST lost item
router.post("/", verifyToken, async (req, res) => {
    try {
        const item = new LostItem({
            ...req.body,
            postedBy: req.user.userId // Set from token
        });
        await item.save();

        // Invalidate cache on new post
        cache.flushAll();

        // Trigger Smart Matcher (Async, don't block response)
        setTimeout(() => findAndNotifyMatches(item, 'lost'), 0);

        // Populate immediately for return
        const populatedItem = await item.populate('postedBy', 'fullName photoURL email');
        res.status(201).json(populatedItem);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET lost items (campus-wise)
router.get("/", async (req, res) => {
    try {
        const cacheKey = `lost_items_${JSON.stringify(req.query)}`;
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            return res.json(cachedData);
        }

        const { campusId, status, postedBy } = req.query;
        let query = {};

        // Sanitize IDs to prevent CastError 500s
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

        // Default to 'active' unless 'all' or specific status requested
        if (status === 'all') {
            // No filter
        } else if (status) {
            query.status = status;
        } else {
            query.status = 'active';
            // Also filter out expired items
            query.expiresAt = { $gt: new Date() };
        }

        const items = await LostItem.find(query)
            .populate('postedBy', 'fullName photoURL email phone role')
            .sort({ createdAt: -1 });

        cache.set(cacheKey, items);
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Mark item as resolved
router.put("/:id/resolve", verifyToken, async (req, res) => {
    try {
        const item = await LostItem.findOne({ _id: req.params.id, postedBy: req.user.userId });
        if (!item) {
            return res.status(404).json({ error: "Item not found or unauthorized" });
        }

        item.status = 'resolved';
        item.resolvedBy = req.user.userId; // Usually self-resolved if manual
        await item.save();

        // Invalidate cache on update
        cache.flushAll();

        // Award small karma for manual cleanup
        await User.findByIdAndUpdate(req.user.userId, { $inc: { karmaPoints: 10 } });

        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE item
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        const item = await LostItem.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        // Only allow deletion if user is the poster or an admin
        if (item.postedBy.toString() !== req.user.userId && req.dbUser.role !== 'admin') {
            return res.status(403).json({ error: "Unauthorized: You can only delete your own items." });
        }

        await item.deleteOne();

        // Invalidate cache on delete
        cache.flushAll();

        res.json({ message: "Deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DEBUG: Catch-all for lost routes to find the 500 error source
router.get("/postedBy:id", async (req, res) => {
    console.log("[DEBUG] Weird Catch Route hit with ID:", req.params.id);
    try {
        const id = req.params.id.replace(':', '');
        const items = await LostItem.find({ postedBy: id });
        res.json(items);
    } catch (err) {
        console.error("[DEBUG] Weird Catch Route Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
