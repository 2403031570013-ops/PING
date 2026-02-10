const express = require('express');
const router = express.Router();
const Claim = require('../models/Claim');
const User = require('../models/User');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Notification = require('../models/Notification');
const verifyToken = require('../middleware/authMiddleware');
const { Expo } = require("expo-server-sdk");
const expo = new Expo();

// Create a Claim (Handover Request)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { itemId, itemType, ownerId, message } = req.body;
        const claimantId = req.dbUser._id;

        const newClaim = new Claim({
            itemId,
            itemType,
            claimantId,
            ownerId,
            message
        });

        await newClaim.save();

        // 1. Notify Owner via DB
        await Notification.create({
            userId: ownerId,
            title: "New Handover Request",
            message: `${req.dbUser.fullName} has a request regarding your item.`,
            type: 'claim',
            data: { claimId: newClaim._id, itemId }
        });

        // 2. Notify Owner via Push
        const owner = await User.findById(ownerId);
        if (owner?.pushToken && Expo.isExpoPushToken(owner.pushToken)) {
            await expo.sendPushNotificationsAsync([{
                to: owner.pushToken,
                title: "New Claim Request",
                body: `${req.dbUser.fullName} has claimed your item. Check app!`,
                data: { claimId: newClaim._id }
            }]);
        }

        res.status(201).json(newClaim);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Claims for My Items (received)
router.get('/received', verifyToken, async (req, res) => {
    try {
        const claims = await Claim.find({ ownerId: req.dbUser._id })
            .populate('claimantId', 'fullName photoURL')
            .populate('itemId')
            .sort({ createdAt: -1 });
        res.json(claims);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Claims I Sent
router.get('/sent', verifyToken, async (req, res) => {
    try {
        const claims = await Claim.find({ claimantId: req.dbUser._id })
            .populate('ownerId', 'fullName photoURL')
            .populate('itemId')
            .sort({ createdAt: -1 });
        res.json(claims);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Claim Status (Approve/Reject)
router.patch('/:id', verifyToken, async (req, res) => {
    try {
        const { status } = req.body; // 'approved' or 'rejected'
        const claim = await Claim.findById(req.params.id);

        if (!claim || claim.ownerId.toString() !== req.dbUser._id.toString()) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        claim.status = status;
        claim.updatedAt = new Date();
        await claim.save();

        // If approved, mark the ITEM itself as Resolved
        if (status === 'approved') {
            const ItemModel = claim.itemType === 'lost' ? LostItem : FoundItem;
            // Update Item Status to 'resolved' and resolvedBy = claimant
            await ItemModel.findByIdAndUpdate(claim.itemId, {
                status: 'resolved',
                resolvedBy: claim.claimantId
            });

            // Award Karma Points (Gamification)
            const karmaAwardeeId = claim.itemType === 'lost' ? claim.claimantId : claim.ownerId;
            await User.findByIdAndUpdate(karmaAwardeeId, { $inc: { karmaPoints: 50 } });
        }

        // Notify Claimant via DB
        await Notification.create({
            userId: claim.claimantId,
            title: `Request ${status.toUpperCase()}`,
            message: `Your request for item was ${status}.`,
            type: status === 'approved' ? 'resolved' : 'info',
            data: { claimId: claim._id, itemId: claim.itemId }
        });

        // Notify Claimant via Push
        const claimant = await User.findById(claim.claimantId);
        if (claimant?.pushToken && Expo.isExpoPushToken(claimant.pushToken)) {
            await expo.sendPushNotificationsAsync([{
                to: claimant.pushToken,
                title: `Claim ${status.toUpperCase()}`,
                body: `Your claim was ${status}.`,
                data: { claimId: claim._id }
            }]);
        }

        res.json(claim);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
