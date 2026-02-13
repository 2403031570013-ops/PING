const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const verifyToken = require('../middleware/authMiddleware');

// Create Report
router.post('/', verifyToken, async (req, res) => {
    try {
        const { itemId, itemType, reason, description } = req.body;

        // Check if already reported by this user
        const existing = await Report.findOne({
            itemId,
            reportedBy: req.dbUser._id,
            status: 'pending'
        });

        if (existing) {
            return res.status(400).json({ message: "You have already reported this item" });
        }

        const report = new Report({
            itemId,
            itemType,
            reportedBy: req.dbUser._id,
            reason,
            description
        });

        await report.save();

        // Notify Item Owner
        try {
            const Model = itemType === 'lost' ? LostItem : FoundItem;
            const item = await Model.findById(itemId);
            if (item && item.postedBy) {
                await Notification.create({
                    userId: item.postedBy,
                    title: "Item Reported",
                    message: "One of your posts has been reported for review.",
                    type: 'system',
                    data: { itemId }
                });
            }
        } catch (e) { console.error("Report notification failed", e); }

        res.status(201).json({ message: "Report submitted. Thank you for keeping our community safe!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Reports (Admin Only)
router.get('/', verifyToken, async (req, res) => {
    try {
        if (req.dbUser.role !== 'admin') {
            return res.status(403).json({ message: "Admin only" });
        }

        const reports = await Report.find()
            .populate('reportedBy', 'fullName email')
            .sort({ createdAt: -1 });

        const enrichedReports = await Promise.all(reports.map(async (r) => {
            const Model = r.itemType === 'lost' ? LostItem : FoundItem;
            const item = await Model.findById(r.itemId).select('title image postedBy').populate('postedBy', 'fullName email _id');
            return {
                ...r.toObject(),
                itemDetails: item || { title: 'Item Deleted', image: null }
            };
        }));

        res.json(enrichedReports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Report Status (Admin Only)
router.patch('/:id', verifyToken, async (req, res) => {
    try {
        if (req.dbUser.role !== 'admin') {
            return res.status(403).json({ message: "Admin only" });
        }

        const { status } = req.body;
        await Report.findByIdAndUpdate(req.params.id, { status });
        res.json({ message: "Report updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
