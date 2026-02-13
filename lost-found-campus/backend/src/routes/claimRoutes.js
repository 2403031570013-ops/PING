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
        const { itemId, itemType, ownerId, message, proofImageUrl } = req.body;
        const claimantId = req.dbUser._id;

        // Validation
        if (!itemId || !ownerId) return res.status(400).json({ message: "Item ID and Owner ID required" });

        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(itemId) || !mongoose.Types.ObjectId.isValid(ownerId)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        if (claimantId.toString() === ownerId.toString()) {
            return res.status(400).json({ message: "You cannot claim your own item!" });
        }

        // Check for existing pending/approved claim by this user for this item
        const existingClaim = await Claim.findOne({ itemId, claimantId, status: { $in: ['pending', 'approved'] } });
        if (existingClaim) {
            return res.status(400).json({ message: "You already have an active request for this item." });
        }

        const newClaim = new Claim({
            itemId,
            itemType,
            claimantId,
            ownerId,
            message,
            proofImageUrl
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

// Update Claim Status (Approve/Reject/Dispute)
router.patch('/:id', verifyToken, async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid claim ID" });
        }
        const claim = await Claim.findById(req.params.id);

        if (!claim) return res.status(404).json({ message: "Claim not found" });

        // Authorization: Owner or Admin
        const isOwner = claim.ownerId.toString() === req.dbUser._id.toString();
        const isAdmin = req.dbUser.role === 'admin' || req.dbUser.role === 'staff';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (adminNotes) claim.adminNotes = adminNotes;
        if (status === 'approved') {
            claim.resolvedAt = new Date();
            // Generate simple 6-digit code for handover verification
            claim.handoverCode = Math.floor(100000 + Math.random() * 900000).toString();
        }

        await claim.save();

        // If approved, notify both parties about the Handover Code
        if (status === 'approved') {
            // Notify Claimant (Receiver) with the Code
            await Notification.create({
                userId: claim.claimantId,
                title: "Handover Authorized! 🔓",
                message: `Your request was approved! Show Code: ${claim.handoverCode} to the owner to collect the item.`,
                type: 'success',
                data: { claimId: claim._id, itemId: claim.itemId, code: claim.handoverCode }
            });

            // Notify Owner (Giver) to expect the Code
            await Notification.create({
                userId: claim.ownerId,
                title: "Handover Authorized! 🤝",
                message: `You authorized the handover. Please ask the claimant for the verification code.`,
                type: 'success',
                data: { claimId: claim._id }
            });

        } else {
            // Notify Claimant
            await Notification.create({
                userId: claim.claimantId,
                title: `Claim Update: ${status.toUpperCase()}`,
                message: `Your request for the item was ${status}. ${adminNotes || ''}`,
                type: status === 'approved' ? 'resolved' : 'info',
                data: { claimId: claim._id, itemId: claim.itemId }
            });
        }

        res.json(claim);
    } catch (err) {
        console.error("Error updating claim:", err);
        res.status(500).json({ error: err.message });
    }
});

// Verify Handover Code (Owner calls this when Claimant gives the code)
router.post('/:id/verify-handover', verifyToken, async (req, res) => {
    try {
        const { code } = req.body;
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid claim ID" });
        }
        const claim = await Claim.findById(req.params.id);

        if (!claim) return res.status(404).json({ message: "Claim not found" });

        // Must be Owner or Admin to verify
        // (Usually Owner enters the code given by Claimant)
        if (claim.ownerId.toString() !== req.dbUser._id.toString() && req.dbUser.role !== 'admin') {
            return res.status(403).json({ message: "Only the item owner can verify the handover code." });
        }

        if (claim.status !== 'approved') {
            return res.status(400).json({ message: "Claim must be approved first." });
        }

        if (claim.handoverCode !== code) {
            return res.status(400).json({ message: "Invalid Handover Code!" });
        }

        // Code Matches! Mark Item as Resolved truly.
        const ItemModel = claim.itemType === 'lost' ? LostItem : FoundItem;
        await ItemModel.findByIdAndUpdate(claim.itemId, {
            status: 'resolved',
            resolvedBy: claim.claimantId
        });

        // Award Karma NOW (only after physical handover)
        const karmaAwardeeId = claim.itemType === 'found' ? claim.ownerId : claim.claimantId; // Who found it gets karma
        // If I found item, I am ownerId (poster) of Found Item.
        // If I lost item, I posted Lost Item. Someone found it. They claim "I found it".
        // Wait, logic check:
        // Found Item: Poster = Finder. Claim = Owner.
        // Lost Item: Poster = Owner. Claim = Finder.

        let finderId;
        if (claim.itemType === 'found') {
            finderId = claim.ownerId; // Poster of Found Item
        } else {
            finderId = claim.claimantId; // Claimer of Lost Item ("I found yours")
        }

        await User.findByIdAndUpdate(finderId, { $inc: { karmaPoints: 50 } });

        // Notify Finder
        await Notification.create({
            userId: finderId,
            title: "Item Returned! 🏆",
            message: "Handover verified! You earned +50 Karma Points for helping out!",
            type: 'success',
            data: { claimId: claim._id }
        });

        // Clear code to prevent reuse (optional, or keep for record)
        // claim.handoverCode = null; 
        claim.status = 'resolved'; // Final state? Or keep 'approved' and rely on Item status?
        // Let's create a 'completed' status for Claim
        claim.status = 'completed'; // New status for Claim lifecycle end
        await claim.save();

        res.json({ message: "Handover verified successfully!", claim });

    } catch (err) {
        console.error("Verification Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Post-reunion Feedback
router.post('/:id/feedback', verifyToken, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid claim ID" });
        }
        const claim = await Claim.findById(req.params.id);

        if (!claim || claim.claimantId.toString() !== req.dbUser._id.toString()) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (claim.status !== 'approved') {
            return res.status(400).json({ message: "Feedback can only be given after approval" });
        }

        claim.feedback = {
            rating,
            comment,
            timestamp: new Date()
        };
        await claim.save();

        // Thank you message logic (auto-notification to owner)
        await Notification.create({
            userId: claim.ownerId,
            title: "Reunion Feedback! ❤️",
            message: `${req.dbUser.fullName} left feedback: "${comment}"`,
            type: 'info'
        });

        res.json({ message: "Thank you for your feedback!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
