const express = require('express');
const router = express.Router();
const FraudReport = require('../models/FraudReport');
const Notification = require('../models/Notification');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const User = require('../models/User');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// Create Report
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { itemId, itemType, reason, description } = req.body;

        const existing = await FraudReport.findOne({
            itemId,
            reporterId: req.user._id,
            status: 'pending'
        });

        if (existing) {
            return res.status(400).json({ message: "You have already reported this item." });
        }

        let initialScore = 10;
        if (req.user.role === 'staff' || req.user.role === 'admin') initialScore = 50;

        const Model = itemType === 'lost' ? LostItem : FoundItem;
        const targetItem = await Model.findById(itemId);

        if (!targetItem) return res.status(404).json({ message: "Item not found." });

        const report = new FraudReport({
            itemId,
            itemType,
            reporterId: req.user._id,
            reportedUserId: targetItem.postedBy,
            reason,
            details: description,
            fraudScore: initialScore
        });

        await report.save();

        // Auto-suspend if multiple reports
        const reportCount = await FraudReport.countDocuments({ reportedUserId: targetItem.postedBy, status: 'pending' });
        if (reportCount >= 3) {
            await User.findByIdAndUpdate(targetItem.postedBy, { status: 'suspended' });
            await Notification.create({
                userId: targetItem.postedBy,
                title: "⚠️ Account Suspended",
                message: "Your account has been suspended due to multiple fraud reports.",
                type: 'admin'
            });
        }

        res.status(201).json({ message: "Report submitted. Thank you for keeping our community safe!" });
    } catch (err) {
        console.error('Create Report Error:', err.message);
        res.status(500).json({ message: "Failed to submit report." });
    }
});

// Get All Reports (Admin/Staff Only)
router.get('/', authMiddleware, requireRole('admin', 'staff'), async (req, res) => {
    try {
        const reports = await FraudReport.find()
            .populate('reporterId', 'fullName email')
            .populate('reportedUserId', 'fullName email')
            .sort({ createdAt: -1 });

        const enrichedReports = await Promise.all(reports.map(async (r) => {
            const Model = r.itemType === 'lost' ? LostItem : FoundItem;
            const item = await Model.findById(r.itemId).select('title image');
            return {
                ...r.toObject(),
                itemDetails: item || { title: 'Item Deleted', image: null }
            };
        }));

        res.json(enrichedReports);
    } catch (err) {
        console.error('Get Reports Error:', err.message);
        res.status(500).json({ message: "Failed to fetch reports." });
    }
});

// Update Report Status (Admin Only)
router.patch('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        const report = await FraudReport.findById(req.params.id);

        if (!report) return res.status(404).json({ message: "Report not found." });

        report.status = status;
        if (adminNotes) report.adminNotes = adminNotes;
        await report.save();

        res.json({ message: "Report updated.", report });
    } catch (err) {
        console.error('Update Report Error:', err.message);
        res.status(500).json({ message: "Failed to update report." });
    }
});

module.exports = router;
