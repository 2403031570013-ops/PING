const express = require('express');
const router = express.Router();
const UserReport = require('../models/UserReport');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// ============================================================
// REPORT A USER ACCOUNT
// ============================================================
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { reportedUserId, reason, description } = req.body;

        if (!reportedUserId || !reason) {
            return res.status(400).json({ message: 'User ID and reason are required.' });
        }

        // Can't report yourself
        if (reportedUserId === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot report your own account.' });
        }

        // Check if reported user exists
        const reportedUser = await User.findById(reportedUserId);
        if (!reportedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Can't report admins
        if (reportedUser.role === 'admin') {
            return res.status(403).json({ message: 'Admin accounts cannot be reported.' });
        }

        // Check duplicate active report
        const existing = await UserReport.findOne({
            reporterId: req.user._id,
            reportedUserId,
            status: { $in: ['pending', 'investigating'] }
        });

        if (existing) {
            return res.status(400).json({ message: 'You have already reported this user. Your report is under review.' });
        }

        // Create report
        const report = await UserReport.create({
            reporterId: req.user._id,
            reportedUserId,
            reason,
            description: description || ''
        });

        // Count total pending reports against this user
        const totalReports = await UserReport.countDocuments({
            reportedUserId,
            status: { $in: ['pending', 'investigating'] }
        });

        // Auto-suspend after 5 reports from different users
        if (totalReports >= 5) {
            await User.findByIdAndUpdate(reportedUserId, { status: 'suspended' });
            await Notification.create({
                userId: reportedUserId,
                title: '⚠️ Account Suspended',
                message: 'Your account has been suspended due to multiple community reports. Contact admin for appeal.',
                type: 'admin'
            });
        }

        // Notify admins
        const admins = await User.find({ role: 'admin' }).select('_id');
        const adminNotifications = admins.map(admin => ({
            userId: admin._id,
            title: '🚨 New User Report',
            message: `${req.user.fullName} reported ${reportedUser.fullName} for: ${reason}`,
            type: 'admin'
        }));
        await Notification.insertMany(adminNotifications);

        res.status(201).json({
            message: 'Report submitted successfully. Our team will review it shortly.',
            reportId: report._id,
            totalReportsAgainstUser: totalReports
        });

    } catch (err) {
        console.error('User Report Error:', err.message);
        res.status(500).json({ message: 'Failed to submit report.' });
    }
});

// ============================================================
// GET MY REPORTS (what I've reported)
// ============================================================
router.get('/my-reports', authMiddleware, async (req, res) => {
    try {
        const reports = await UserReport.find({ reporterId: req.user._id })
            .populate('reportedUserId', 'fullName email photoURL')
            .sort({ createdAt: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch reports.' });
    }
});

// ============================================================
// GET ALL USER REPORTS (Admin Only)
// ============================================================
router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const reports = await UserReport.find()
            .populate('reporterId', 'fullName email photoURL')
            .populate('reportedUserId', 'fullName email photoURL status role')
            .populate('resolvedBy', 'fullName')
            .sort({ createdAt: -1 });
        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch user reports.' });
    }
});

// ============================================================
// UPDATE REPORT STATUS (Admin Only)
// ============================================================
router.patch('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { status, adminNotes, actionTaken } = req.body;
        const report = await UserReport.findById(req.params.id)
            .populate('reportedUserId', 'fullName');

        if (!report) return res.status(404).json({ message: 'Report not found.' });

        report.status = status || report.status;
        if (adminNotes) report.adminNotes = adminNotes;
        if (actionTaken) report.actionTaken = actionTaken;

        if (status === 'action_taken' || status === 'dismissed') {
            report.resolvedBy = req.user._id;
            report.resolvedAt = new Date();
        }

        // Apply action to user
        if (actionTaken === 'suspended') {
            await User.findByIdAndUpdate(report.reportedUserId._id, { status: 'suspended' });
        } else if (actionTaken === 'banned') {
            await User.findByIdAndUpdate(report.reportedUserId._id, { status: 'banned' });
        } else if (actionTaken === 'warning') {
            await Notification.create({
                userId: report.reportedUserId._id,
                title: '⚠️ Account Warning',
                message: 'You have received a warning due to a community report. Repeated violations may result in suspension.',
                type: 'admin'
            });
        }

        await report.save();

        res.json({ message: 'Report updated.', report });
    } catch (err) {
        console.error('Update User Report Error:', err.message);
        res.status(500).json({ message: 'Failed to update report.' });
    }
});

// ============================================================
// BLOCK A USER
// ============================================================
router.post('/block/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        if (userId === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot block yourself.' });
        }

        const user = await User.findById(req.user._id);
        if (!user.blockedUsers) user.blockedUsers = [];

        if (user.blockedUsers.includes(userId)) {
            return res.status(400).json({ message: 'User is already blocked.' });
        }

        user.blockedUsers.push(userId);
        await user.save();

        res.json({ message: 'User blocked successfully. You will no longer see their items or messages.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to block user.' });
    }
});

// ============================================================
// UNBLOCK A USER
// ============================================================
router.post('/unblock/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(req.user._id);
        if (!user.blockedUsers) user.blockedUsers = [];

        user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== userId);
        await user.save();

        res.json({ message: 'User unblocked.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to unblock user.' });
    }
});

// ============================================================
// GET BLOCKED USERS
// ============================================================
router.get('/blocked', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('blockedUsers', 'fullName email photoURL');
        res.json(user.blockedUsers || []);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch blocked users.' });
    }
});

// ============================================================
// DELETE MY ACCOUNT
// ============================================================
router.delete('/delete-account', authMiddleware, async (req, res) => {
    try {
        const { confirmation } = req.body;

        if (confirmation !== 'DELETE') {
            return res.status(400).json({ message: 'Please type DELETE to confirm account deletion.' });
        }

        // Soft delete - anonymize the user
        await User.findByIdAndUpdate(req.user._id, {
            status: 'banned',
            fullName: 'Deleted User',
            email: `deleted_${req.user._id}@removed.com`,
            photoURL: null,
            phone: null,
            pushToken: null,
            refreshToken: null
        });

        res.json({ message: 'Account deleted successfully. You have been logged out.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete account.' });
    }
});

module.exports = router;
