const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Claim = require('../models/Claim');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const User = require('../models/User');
const Notification = require('../models/Notification');
const NftBadge = require('../models/NftBadge');
const { logToBlockchain } = require('../utils/blockchain');
const { authMiddleware } = require('../middleware/authMiddleware');

// ============================================================
// CREATE CLAIM
// ============================================================

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { itemId, itemType, description, evidence } = req.body;

        if (!itemId || !itemType) {
            return res.status(400).json({ message: 'Item ID and item type are required.' });
        }

        if (!['LostItem', 'FoundItem', 'lost', 'found'].includes(itemType)) {
            return res.status(400).json({ message: 'Invalid item type.' });
        }

        // Normalize item type
        const normalizedType = itemType === 'lost' ? 'LostItem' : itemType === 'found' ? 'FoundItem' : itemType;
        const ItemModel = normalizedType === 'LostItem' ? LostItem : FoundItem;

        // Check if item exists
        const item = await ItemModel.findById(itemId);
        if (!item) {
            return res.status(404).json({ message: 'Item not found.' });
        }

        if (item.status !== 'active') {
            return res.status(400).json({ message: 'This item has already been resolved or archived.' });
        }

        // Cannot claim own item
        if (item.postedBy.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot claim your own item.' });
        }

        // Check for duplicate claims
        const existingClaim = await Claim.findOne({
            itemId,
            claimantId: req.user._id,
            status: { $in: ['pending', 'approved'] }
        });

        if (existingClaim) {
            return res.status(400).json({ message: 'You already have an active claim for this item.' });
        }

        // Create claim
        const claim = await Claim.create({
            itemId,
            itemType: normalizedType,
            claimantId: req.user._id,
            ownerId: item.postedBy,
            description: description || null,
            evidence: evidence || null,
        });

        // Notify item owner
        await Notification.create({
            userId: item.postedBy,
            title: '📦 New Claim Request',
            message: `${req.user.fullName} wants to claim "${item.title}". Review the request in your handover panel.`,
            type: 'claim',
            data: { claimId: claim._id, itemId: item._id }
        });

        // Emit socket event
        if (req.app.get('io')) {
            req.app.get('io').to(item.postedBy.toString()).emit('new-notification', {
                title: '📦 New Claim Request',
                message: `${req.user.fullName} wants to claim "${item.title}".`
            });
        }

        res.status(201).json({
            message: 'Claim submitted successfully!',
            claim
        });

    } catch (err) {
        console.error('Create Claim Error:', err);
        res.status(500).json({ message: 'Failed to create claim.' });
    }
});

// ============================================================
// GET CLAIMS (RECEIVED BY USER)
// ============================================================

router.get('/received', authMiddleware, async (req, res) => {
    try {
        const claims = await Claim.find({ ownerId: req.user._id })
            .populate('claimantId', 'fullName email photoURL phone')
            .populate('itemId')
            .sort({ createdAt: -1 });

        res.json(claims);

    } catch (err) {
        console.error('Received Claims Error:', err);
        res.status(500).json({ message: 'Failed to fetch claims.' });
    }
});

// ============================================================
// GET CLAIMS (SENT BY USER)
// ============================================================

router.get('/sent', authMiddleware, async (req, res) => {
    try {
        const claims = await Claim.find({ claimantId: req.user._id })
            .populate('ownerId', 'fullName email photoURL')
            .populate('itemId')
            .sort({ createdAt: -1 });

        res.json(claims);

    } catch (err) {
        console.error('Sent Claims Error:', err);
        res.status(500).json({ message: 'Failed to fetch claims.' });
    }
});

// ============================================================
// UPDATE CLAIM STATUS (approve/reject)
// ============================================================

router.patch('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;

        if (!['approved', 'rejected', 'cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Use: approved, rejected, or cancelled.' });
        }

        const claim = await Claim.findById(req.params.id)
            .populate('itemId')
            .populate('claimantId', 'fullName');

        if (!claim) {
            return res.status(404).json({ message: 'Claim not found.' });
        }

        // Authorization check
        if (status === 'cancelled') {
            // Only claimant can cancel
            if (claim.claimantId._id.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Only the claimant can cancel this claim.' });
            }
        } else {
            // Only owner can approve/reject
            if (claim.ownerId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Only the item owner can approve or reject claims.' });
            }
        }

        if (claim.status !== 'pending') {
            return res.status(400).json({ message: `Claim has already been ${claim.status}.` });
        }

        claim.status = status;
        if (status === 'approved') claim.approvedAt = new Date();
        if (status === 'rejected') claim.rejectedAt = new Date();
        await claim.save();

        // Notify claimant
        const statusEmoji = { approved: '✅', rejected: '❌', cancelled: '🚫' };
        await Notification.create({
            userId: claim.claimantId._id,
            title: `${statusEmoji[status]} Claim ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: status === 'approved'
                ? `Your claim for "${claim.itemId?.title}" has been approved! Use the handover code to collect it.`
                : `Your claim for "${claim.itemId?.title}" has been ${status}.`,
            type: 'claim',
            data: { claimId: claim._id }
        });

        // Emit socket event
        if (req.app.get('io')) {
            req.app.get('io').to(claim.claimantId._id.toString()).emit('new-notification', {
                title: `Claim ${status}`,
                message: `Your claim for "${claim.itemId?.title}" has been ${status}.`
            });
        }

        res.json({ message: `Claim ${status} successfully.`, claim });

    } catch (err) {
        console.error('Update Claim Status Error:', err);
        res.status(500).json({ message: 'Failed to update claim.' });
    }
});

// ============================================================
// VERIFY HANDOVER CODE
// ============================================================

router.post('/:id/verify-handover', authMiddleware, async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ message: 'Handover code is required.' });
        }

        const claim = await Claim.findById(req.params.id)
            .populate('itemId')
            .populate('claimantId', 'fullName campusId')
            .populate('ownerId', 'fullName campusId');

        if (!claim) {
            return res.status(404).json({ message: 'Claim not found.' });
        }

        if (claim.status !== 'approved') {
            return res.status(400).json({ message: 'This claim has not been approved yet.' });
        }

        // Only item owner can verify the handover code
        if (claim.ownerId._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the item owner can verify the handover.' });
        }

        // Check verification attempts
        if (claim.verificationAttempts >= claim.maxVerificationAttempts) {
            return res.status(429).json({
                message: 'Maximum verification attempts exceeded. Please contact admin.'
            });
        }

        // Verify code
        if (claim.handoverCode !== code) {
            claim.verificationAttempts += 1;
            await claim.save();
            return res.status(400).json({
                message: `Invalid code. ${claim.maxVerificationAttempts - claim.verificationAttempts} attempts remaining.`
            });
        }

        // Mark as completed
        claim.status = 'completed';
        claim.completedAt = new Date();
        claim.handoverVerifiedAt = new Date();
        await claim.save();

        // Resolve the item
        const ItemModel = claim.itemType === 'LostItem' ? LostItem : FoundItem;
        await ItemModel.findByIdAndUpdate(claim.itemId._id || claim.itemId, {
            status: 'resolved',
            resolvedAt: new Date(),
            resolvedBy: claim.claimantId._id
        });

        // Award Karma Points
        const karmaForFinder = 10;
        const karmaForReporter = 5;

        // Determine who is the "finder" (who returned the item)
        const isLostItem = claim.itemType === 'LostItem';
        const finderId = isLostItem ? claim.claimantId._id : claim.ownerId._id;
        const reporterId = isLostItem ? claim.ownerId._id : claim.claimantId._id;

        await User.findByIdAndUpdate(finderId, { $inc: { karmaPoints: karmaForFinder } });
        await User.findByIdAndUpdate(reporterId, { $inc: { karmaPoints: karmaForReporter } });

        // Check for NFT badge eligibility
        try {
            const finder = await User.findById(finderId);
            const completedClaims = await Claim.countDocuments({
                $or: [
                    { claimantId: finderId, status: 'completed' },
                    { ownerId: finderId, status: 'completed' }
                ]
            });

            // First Return badge
            if (completedClaims === 1) {
                await NftBadge.mintBadge('FIRST_RETURN', finderId, {
                    itemId: claim.itemId._id || claim.itemId,
                    claimId: claim._id,
                    campusId: finder.campusId,
                    campusName: 'Campus'
                });

                await Notification.create({
                    userId: finderId,
                    title: '🎖️ NFT Badge Minted!',
                    message: 'Congratulations! You earned the "First Return" badge for your first successful item return!',
                    type: 'nft',
                    data: { badgeType: 'FIRST_RETURN' }
                });
            }

            // Good Samaritan badge
            if (completedClaims === 5) {
                await NftBadge.mintBadge('GOOD_SAMARITAN', finderId, {
                    itemId: claim.itemId._id || claim.itemId,
                    claimId: claim._id,
                    campusId: finder.campusId
                });
            }

            // Campus Guardian badge
            if (completedClaims === 10) {
                await NftBadge.mintBadge('CAMPUS_GUARDIAN', finderId, {
                    itemId: claim.itemId._id || claim.itemId,
                    claimId: claim._id,
                    campusId: finder.campusId
                });
            }

            // Speed Demon badge (resolved within 1 hour of posting)
            const item = claim.itemId;
            if (item && item.createdAt) {
                const hoursDiff = (new Date() - new Date(item.createdAt)) / (1000 * 60 * 60);
                if (hoursDiff <= 1) {
                    await NftBadge.mintBadge('SPEED_DEMON', finderId, {
                        itemId: item._id,
                        claimId: claim._id,
                        campusId: finder.campusId
                    });
                }
            }
        } catch (nftErr) {
            console.error('NFT Badge Error (non-critical):', nftErr.message);
        }

        // Log to blockchain
        try {
            await logToBlockchain(claim.itemId._id || claim.itemId, 'HANDOVER_COMPLETE', {
                claimId: claim._id,
                finder: finderId,
                reporter: reporterId,
                verifiedAt: claim.handoverVerifiedAt
            });
        } catch (blockchainErr) {
            console.error('Blockchain log error (non-critical):', blockchainErr.message);
        }

        // Notify both parties
        await Notification.create({
            userId: claim.claimantId._id,
            title: '🎉 Handover Complete!',
            message: `Item "${claim.itemId?.title}" has been successfully handed over. Thank you!`,
            type: 'claim',
            data: { claimId: claim._id }
        });

        res.json({
            message: 'Handover verified successfully! Item marked as resolved.',
            claim,
            karmaAwarded: { finder: karmaForFinder, reporter: karmaForReporter }
        });

    } catch (err) {
        console.error('Verify Handover Error:', err);
        res.status(500).json({ message: 'Handover verification failed.' });
    }
});

// ============================================================
// SUBMIT FEEDBACK
// ============================================================

router.post('/:id/feedback', authMiddleware, async (req, res) => {
    try {
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        }

        const claim = await Claim.findById(req.params.id);
        if (!claim) {
            return res.status(404).json({ message: 'Claim not found.' });
        }

        if (claim.status !== 'completed') {
            return res.status(400).json({ message: 'Feedback can only be given for completed claims.' });
        }

        // Check if user is part of the claim
        const isParticipant = [claim.claimantId.toString(), claim.ownerId.toString()]
            .includes(req.user._id.toString());

        if (!isParticipant) {
            return res.status(403).json({ message: 'You are not part of this claim.' });
        }

        claim.feedback = {
            rating,
            comment: comment || null,
            givenBy: req.user._id
        };
        await claim.save();

        // Award bonus karma for 5-star rating
        if (rating === 5) {
            const otherUserId = claim.claimantId.toString() === req.user._id.toString()
                ? claim.ownerId
                : claim.claimantId;

            await User.findByIdAndUpdate(otherUserId, { $inc: { karmaPoints: 5 } });

            // Community Star badge
            try {
                await NftBadge.mintBadge('COMMUNITY_STAR', otherUserId, {
                    claimId: claim._id
                });
            } catch (nftErr) {
                // Non-critical
            }
        }

        res.json({ message: 'Feedback submitted. Thank you!' });

    } catch (err) {
        console.error('Feedback Error:', err);
        res.status(500).json({ message: 'Failed to submit feedback.' });
    }
});

module.exports = router;
