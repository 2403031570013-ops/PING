const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Claim = require('../models/Claim');
const AuditLog = require('../models/AuditLog');
const ActivityLog = require('../models/ActivityLog');
const FraudReport = require('../models/FraudReport');
const NftBadge = require('../models/NftBadge');
const Notification = require('../models/Notification');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// ============================================================
// DASHBOARD STATS
// ============================================================

router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const campusId = req.user.campusId?._id || req.user.campusId;
        const campusFilter = campusId ? { campusId } : {};

        const [
            totalLost,
            totalFound,
            activeLost,
            activeFound,
            resolvedLost,
            resolvedFound,
            totalClaims,
            pendingClaims,
            completedClaims,
            totalUsers,
            activeUsers,
            fraudReports
        ] = await Promise.all([
            LostItem.countDocuments(campusFilter),
            FoundItem.countDocuments(campusFilter),
            LostItem.countDocuments({ ...campusFilter, status: 'active' }),
            FoundItem.countDocuments({ ...campusFilter, status: 'active' }),
            LostItem.countDocuments({ ...campusFilter, status: 'resolved' }),
            FoundItem.countDocuments({ ...campusFilter, status: 'resolved' }),
            Claim.countDocuments(),
            Claim.countDocuments({ status: 'pending' }),
            Claim.countDocuments({ status: 'completed' }),
            User.countDocuments(campusFilter),
            User.countDocuments({ ...campusFilter, status: 'active' }),
            FraudReport.countDocuments({ status: 'pending' })
        ]);

        res.json({
            summary: {
                totalLost,
                totalFound,
                activeLost,
                activeFound,
                resolvedCount: resolvedLost + resolvedFound,
                totalClaims,
                pendingClaims,
                completedClaims,
                totalUsers,
                activeUsers,
                pendingFraudReports: fraudReports,
                resolutionRate: (totalLost + totalFound) > 0
                    ? Math.round(((resolvedLost + resolvedFound) / (totalLost + totalFound)) * 100)
                    : 0
            }
        });

    } catch (err) {
        console.error('Stats Error:', err.message);
        res.status(500).json({ message: 'Failed to fetch stats.' });
    }
});

// ============================================================
// USER MANAGEMENT
// ============================================================

router.get('/users', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { page = 1, limit = 50, role, status, search } = req.query;
        const campusId = req.user.campusId?._id || req.user.campusId;

        const filter = {};
        if (campusId) filter.campusId = campusId;
        if (role) filter.role = role;
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(filter)
            .select('-password -otp -otpExpires -refreshToken')
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        const total = await User.countDocuments(filter);

        res.json({
            users,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
        });

    } catch (err) {
        console.error('Users List Error:', err.message);
        res.status(500).json({ message: 'Failed to fetch users.' });
    }
});

// ============================================================
// APPROVE USER
// ============================================================

router.patch('/users/:id/approve', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        user.isApproved = true;
        await user.save();

        await AuditLog.create({
            action: 'APPROVE_USER',
            targetId: user._id,
            targetType: 'User',
            performedBy: req.user._id,
            campusId: req.user.campusId?._id || req.user.campusId,
            note: `Approved user: ${user.fullName}`
        });

        // Notify user
        await Notification.create({
            userId: user._id,
            title: '✅ Account Approved',
            message: 'Your account has been approved by the campus admin. You can now access all features!',
            type: 'admin'
        });

        res.json({ message: 'User approved.', user });

    } catch (err) {
        console.error('Approve Error:', err.message);
        res.status(500).json({ message: 'Failed to approve user.' });
    }
});

// ============================================================
// SUSPEND/BAN USER
// ============================================================

router.patch('/users/:id/status', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { status, reason } = req.body;

        if (!['active', 'suspended', 'banned'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status.' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        // Prevent admin from deactivating themselves
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot change your own status.' });
        }

        const oldStatus = user.status;
        user.status = status;
        await user.save();

        await AuditLog.create({
            action: `USER_${status.toUpperCase()}`,
            targetId: user._id,
            targetType: 'User',
            performedBy: req.user._id,
            campusId: req.user.campusId?._id || req.user.campusId,
            oldValue: { status: oldStatus },
            newValue: { status },
            note: reason || `User status changed to ${status}`
        });

        // Notify user
        await Notification.create({
            userId: user._id,
            title: status === 'suspended' ? '⚠️ Account Suspended' : status === 'banned' ? '🚫 Account Banned' : '✅ Account Reactivated',
            message: reason || `Your account status has been changed to ${status}.`,
            type: 'admin'
        });

        res.json({ message: `User ${status} successfully.`, user });

    } catch (err) {
        console.error('User Status Error:', err.message);
        res.status(500).json({ message: 'Failed to update user status.' });
    }
});

// ============================================================
// FRAUD REPORTS
// ============================================================

router.get('/fraud-reports', authMiddleware, requireRole('admin', 'staff'), async (req, res) => {
    try {
        const reports = await FraudReport.find()
            .populate('reporterId', 'fullName email')
            .populate('reportedUserId', 'fullName email status')
            .sort({ createdAt: -1 });

        res.json(reports);

    } catch (err) {
        console.error('Fraud Reports Error:', err.message);
        res.status(500).json({ message: 'Failed to fetch fraud reports.' });
    }
});

router.patch('/fraud-reports/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { status, resolution } = req.body;

        const report = await FraudReport.findById(req.params.id);
        if (!report) return res.status(404).json({ message: 'Report not found.' });

        report.status = status || report.status;
        if (resolution) report.resolution = resolution;
        report.reviewedBy = req.user._id;
        report.reviewedAt = new Date();
        await report.save();

        await AuditLog.create({
            action: 'REVIEW_FRAUD_REPORT',
            targetId: report._id,
            targetType: 'FraudReport',
            performedBy: req.user._id,
            campusId: req.user.campusId?._id || req.user.campusId,
            note: `Report ${status}: ${resolution || 'No notes'}`
        });

        res.json({ message: 'Report updated.', report });

    } catch (err) {
        console.error('Update Fraud Report Error:', err.message);
        res.status(500).json({ message: 'Failed to update report.' });
    }
});

// ============================================================
// AUDIT LOGS
// ============================================================

router.get('/audit-logs', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const campusId = req.user.campusId?._id || req.user.campusId;

        const filter = campusId ? { campusId } : {};

        const logs = await AuditLog.find(filter)
            .populate('performedBy', 'fullName email')
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        const total = await AuditLog.countDocuments(filter);

        res.json({
            logs,
            pagination: { page: parseInt(page), limit: parseInt(limit), total }
        });

    } catch (err) {
        console.error('Audit Logs Error:', err.message);
        res.status(500).json({ message: 'Failed to fetch audit logs.' });
    }
});

// ============================================================
// ACTIVITY LOGS
// ============================================================

router.get('/activity-logs', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;

        const logs = await ActivityLog.find()
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        res.json(logs);

    } catch (err) {
        console.error('Activity Logs Error:', err.message);
        res.status(500).json({ message: 'Failed to fetch activity logs.' });
    }
});

// ============================================================
// ITEM GOVERNANCE (Lock/Flag/Unlock)
// ============================================================

router.patch('/items/:type/:id/governance', authMiddleware, requireRole('admin', 'staff'), async (req, res) => {
    try {
        const { type, id } = req.params;
        const { status, flagged, flagReason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid item ID.' });
        }

        const Model = type === 'lost' ? LostItem : FoundItem;
        const item = await Model.findById(id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found.' });
        }

        // Campus isolation check
        const userCampusId = req.user.campusId?._id?.toString() || req.user.campusId?.toString();
        if (userCampusId && item.campusId.toString() !== userCampusId) {
            return res.status(403).json({ message: 'You can only manage items in your own campus.' });
        }

        if (status) item.status = status;
        if (flagged !== undefined) item.flagged = flagged;
        if (flagReason) item.flagReason = flagReason;

        await item.save();

        await AuditLog.create({
            action: 'ITEM_GOVERNANCE',
            targetId: item._id,
            targetType: type === 'lost' ? 'LostItem' : 'FoundItem',
            performedBy: req.user._id,
            campusId: req.user.campusId?._id || req.user.campusId,
            note: flagReason || `Item status changed to ${status}`
        });

        res.json({ message: 'Item governance updated.', item });

    } catch (err) {
        console.error('Governance Error:', err.message);
        res.status(500).json({ message: 'Failed to update governance.' });
    }
});

// ============================================================
// DATA EXPORT (CSV) - Fixed to include both Lost AND Found items
// ============================================================

router.get('/export/csv', authMiddleware, requireRole('admin', 'staff'), async (req, res) => {
    try {
        const campusId = req.user.campusId?._id || req.user.campusId;
        const { year } = req.query;

        let query = {};
        if (campusId) query.campusId = campusId;

        if (year) {
            const start = new Date(`${year}-01-01`);
            const end = new Date(`${parseInt(year) + 1}-01-01`);
            query.createdAt = { $gte: start, $lt: end };
        }

        const [lostItems, foundItems] = await Promise.all([
            LostItem.find(query).populate('postedBy', 'fullName email').lean(),
            FoundItem.find(query).populate('postedBy', 'fullName email').lean()
        ]);

        // Build CSV
        const fields = ['ID', 'Type', 'Title', 'Category', 'Location', 'Status', 'Posted By', 'Date'];
        let csv = fields.join(',') + '\n';

        const formatRow = (item, type) => {
            return [
                item._id,
                type,
                `"${(item.title || '').replace(/"/g, '""')}"`,
                item.category || 'Others',
                `"${(item.location || 'Unknown').replace(/"/g, '""')}"`,
                item.status || 'active',
                `"${item.postedBy?.fullName || 'Unknown'}"`,
                item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : 'N/A'
            ].join(',');
        };

        lostItems.forEach(item => { csv += formatRow(item, 'Lost') + '\n'; });
        foundItems.forEach(item => { csv += formatRow(item, 'Found') + '\n'; });

        res.header('Content-Type', 'text/csv');
        res.attachment(`Lost_Found_Report_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);

    } catch (err) {
        console.error('Export Error:', err.message);
        res.status(500).json({ message: 'Failed to export data.' });
    }
});

// ============================================================
// CAMPUS LEADERBOARD
// ============================================================

router.get('/leaderboard', authMiddleware, async (req, res) => {
    try {
        const campusId = req.query.campusId || req.user.campusId?._id || req.user.campusId;

        const filter = { karmaPoints: { $gt: 0 }, status: 'active' };
        if (campusId) filter.campusId = campusId;

        const heroes = await User.find(filter)
            .sort({ karmaPoints: -1 })
            .limit(50)
            .select('fullName photoURL karmaPoints role')
            .populate('campusId', 'name');

        const leaderboard = heroes.map((user, index) => ({
            rank: index + 1,
            _id: user._id,
            fullName: user.fullName,
            photoURL: user.photoURL,
            karmaPoints: user.karmaPoints,
            role: user.role,
            campus: user.campusId?.name || 'Unknown'
        }));

        res.json(leaderboard);

    } catch (err) {
        console.error('Leaderboard Error:', err.message);
        res.status(500).json({ message: 'Failed to fetch leaderboard.' });
    }
});

module.exports = router;
