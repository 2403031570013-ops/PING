const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const Campus = require('../models/Campus');
const Claim = require('../models/Claim');
const AuditLog = require('../models/AuditLog');
const ActivityLog = require('../models/ActivityLog');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const verifyToken = require('../middleware/authMiddleware');

// Middleware to ensure Admin or Staff access
const isAdminOrStaff = (req, res, next) => {
    if (req.dbUser.role === 'admin' || req.dbUser.role === 'staff') {
        next();
    } else {
        res.status(403).json({ message: "Higher privileges required (Staff/Admin only)" });
    }
};

// Middleware for Admin ONLY
const isAdminOnly = (req, res, next) => {
    if (req.dbUser.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: "Restricted to Campus Principal / Admin only" });
    }
};

// 1. Dashboard Overview Stats (Accessible to all users for impact tracking)
router.get('/stats', verifyToken, async (req, res) => {
    try {
        const campusId = req.dbUser.campusId;
        if (!campusId) {
            return res.status(400).json({ message: "Campus ID not associated with user. Please contact admin." });
        }
        const [totalLost, totalFound, pendingClaims, resolvedCount, totalUsers] = await Promise.all([
            LostItem.countDocuments({ campusId }),
            FoundItem.countDocuments({ campusId }),
            Claim.countDocuments({ status: 'pending' }),
            Claim.countDocuments({ status: 'approved' }),
            User.countDocuments({ campusId })
        ]);

        const categoryBreakdown = await LostItem.aggregate([
            { $match: { campusId: new mongoose.Types.ObjectId(campusId) } },
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        res.json({
            summary: {
                totalLost,
                totalFound,
                pendingClaims,
                resolvedCount,
                totalUsers,
                successRate: totalLost > 0 ? ((resolvedCount / totalLost) * 100).toFixed(2) : 0,
                breakdown: categoryBreakdown
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 1.1 Location Heatmap & High-Value Flags
router.get('/analytics/heatmap', verifyToken, isAdminOrStaff, async (req, res) => {
    try {
        const campusId = req.dbUser.campusId;
        const stats = await LostItem.aggregate([
            { $match: { campusId: new mongoose.Types.ObjectId(campusId) } },
            {
                $group: {
                    _id: "$location",
                    count: { $sum: 1 },
                    highValueCount: { $sum: { $cond: ["$isHighValue", 1, 0] } }
                }
            },
            { $sort: { count: -1 } }
        ]);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. User Management (list, approve, suspend)
router.get('/users', verifyToken, isAdminOrStaff, async (req, res) => {
    try {
        const users = await User.find({ campusId: req.dbUser.campusId })
            .select('-password')
            .sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/users/:id/status', verifyToken, isAdminOnly, async (req, res) => {
    try {
        const { status, note } = req.body; // 'active', 'suspended'
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Ensure user belongs to same campus
        if (user.campusId.toString() !== req.dbUser.campusId.toString()) {
            return res.status(403).json({ message: "You can only manage users in your own campus." });
        }

        const oldStatus = user.status;
        user.status = status;
        await user.save();

        // Audit Log
        await AuditLog.create({
            action: status === 'suspended' ? 'SUSPEND_USER' : 'REACTIVATE_USER',
            targetId: user._id,
            targetType: 'User',
            performedBy: req.dbUser._id,
            campusId: req.dbUser.campusId,
            oldValue: { status: oldStatus },
            newValue: { status: status },
            note: note || "Administrative action"
        });

        res.json({ message: `User status updated to ${status}`, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/users/:id/approve', verifyToken, isAdminOnly, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Ensure user belongs to same campus
        if (user.campusId.toString() !== req.dbUser.campusId.toString()) {
            return res.status(403).json({ message: "You can only manage users in your own campus." });
        }

        user.isApproved = true;
        await user.save();

        await AuditLog.create({
            action: 'APPROVE_STAFF',
            targetId: user._id,
            targetType: 'User',
            performedBy: req.dbUser._id,
            campusId: req.dbUser.campusId,
            newValue: { isApproved: true }
        });

        res.json({ message: "Staff account approved", user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Audit Logs View
router.get('/audit-logs', verifyToken, isAdminOrStaff, async (req, res) => {
    try {
        const logs = await AuditLog.find({ campusId: req.dbUser.campusId })
            .populate('performedBy', 'fullName email')
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Activity Logs (Login History)
router.get('/activity-logs/:userId', verifyToken, isAdminOrStaff, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const targetUser = await User.findById(req.params.userId);
        if (!targetUser) return res.status(404).json({ message: "User not found" });

        // Security check: must be same campus
        if (targetUser.campusId.toString() !== req.dbUser.campusId.toString()) {
            return res.status(403).json({ message: "Access denied: User belongs to another campus." });
        }

        const logs = await ActivityLog.find({ userId: req.params.userId })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Locking / Flagging Items
router.patch('/items/:type/:id/governance', verifyToken, isAdminOrStaff, async (req, res) => {
    try {
        const { type, id } = req.params;
        const { status, isHighValue, adminNotes, cctvReference } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid item ID" });
        }

        const Model = type === 'lost' ? LostItem : FoundItem;
        const item = await Model.findById(id);
        if (!item) return res.status(404).json({ message: "Item not found" });

        // Ensure item belongs to same campus
        if (item.campusId.toString() !== req.dbUser.campusId.toString()) {
            return res.status(403).json({ message: "You can only govern items in your own campus." });
        }
        if (!item) return res.status(404).json({ message: "Item not found" });

        if (status) item.status = status;
        if (isHighValue !== undefined) item.isHighValue = isHighValue;
        if (adminNotes !== undefined) item.adminNotes = adminNotes;
        if (cctvReference !== undefined) item.cctvReference = cctvReference;

        // Add to lifecycle
        item.lifecycle.push({
            status: item.status,
            updatedBy: req.dbUser._id,
            note: adminNotes || "Governance update"
        });

        await item.save();

        await AuditLog.create({
            action: 'UPDATE_ITEM_GOVERNANCE',
            targetId: item._id,
            targetType: type === 'lost' ? 'LostItem' : 'FoundItem',
            performedBy: req.dbUser._id,
            campusId: req.dbUser.campusId,
            note: adminNotes
        });

        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Data Export (CSV Simulation)
router.get('/export/csv', verifyToken, isAdminOrStaff, async (req, res) => {
    try {
        const { year, semester } = req.query;
        let query = { campusId: req.dbUser.campusId };
        if (year) query.academicYear = year; // Assuming items have this too if needed, or filter by dates

        const items = await LostItem.find(query).populate('postedBy', 'fullName');

        // In a real app, we'd use a CSV library here. For now, returning JSON that can be processed.
        res.json({
            filename: `Audit_Report_${new Date().toLocaleDateString()}.csv`,
            data: items
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Campus Heroes Leaderboard
router.get('/leaderboard', verifyToken, async (req, res) => {
    try {
        // Fetch top 10 users by Karma Points
        const { campusId } = req.query;
        let query = { karmaPoints: { $gt: 0 } };

        // If campusId is provided (e.g. from frontend user context), filter by it
        // Otherwise checks req.dbUser.campusId if we wanted strict scoping, 
        // but leaderboard could be global or local. Let's support both.
        if (campusId) {
            query.campusId = campusId;
        } else if (req.dbUser?.campusId) {
            query.campusId = req.dbUser.campusId;
        }

        const heroes = await User.find(query)
            .sort({ karmaPoints: -1 })
            .limit(10)
            .select('fullName photoURL karmaPoints role campusId')
            .populate('campusId', 'name');

        res.json(heroes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
