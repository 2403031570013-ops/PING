const express = require('express');
const router = express.Router();
const FoundItem = require('../models/FoundItem');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/authMiddleware');
const { logToBlockchain } = require('../utils/blockchain');
const { findAndNotifyMatches } = require('../utils/matcher');
const { generateImageEmbedding } = require('../utils/aiService');
const { uploadBase64 } = require('../utils/cloudinary');

// ============================================================
// POST FOUND ITEM
// ============================================================

router.post('/', authMiddleware, async (req, res) => {
    try {
        let { title, description, location, category, image, campusId, storedAt, coordinates } = req.body;

        if (!title || !description || !location || !image) {
            const missing = [];
            if (!title) missing.push('Title');
            if (!description) missing.push('Description');
            if (!location) missing.push('Location');
            if (!image) missing.push('Photo');
            return res.status(400).json({ message: `Missing mandatory fields: ${missing.join(', ')}` });
        }

        // Upload to Cloudinary if it's a data URI
        if (image && image.startsWith('data:')) {
            try {
                image = await uploadBase64(image);
            } catch (e) {
                console.warn('[FOUND] Cloudinary upload failed, keeping base64:', e.message);
                // Keep the base64 image as-is (works for demo)
            }
        }

        const targetCampusId = campusId || req.user.campusId?._id || req.user.campusId;
        if (!targetCampusId) {
            return res.status(400).json({ message: 'Campus is required.' });
        }

        // Generate embedding for matching
        let embedding = [];
        if (image) {
            try {
                embedding = await generateImageEmbedding(image);
            } catch (e) {
                // Non-critical
            }
        }

        const item = await FoundItem.create({
            title: title.trim(),
            description: description.trim(),
            location: location.trim(),
            category: category || 'Others',
            image: image || null,
            campusId: targetCampusId,
            postedBy: req.user._id,
            storedAt: storedAt || null,
            coordinates: coordinates || {},
            embedding,
        });

        // Award karma for reporting a found item
        await User.findByIdAndUpdate(req.user._id, { $inc: { karmaPoints: 5 } });

        // Blockchain logging (non-blocking)
        logToBlockchain(item._id, 'ITEM_POSTED', {
            type: 'found',
            title: item.title,
            postedBy: req.user._id,
            campusId: targetCampusId
        }).catch(err => console.error('Blockchain log error:', err.message));

        // Smart matching (non-blocking)
        findAndNotifyMatches(item, 'found').catch(err =>
            console.error('Match error:', err.message)
        );

        res.status(201).json(item);

    } catch (err) {
        console.error('Post Found Item Error:', err.message);
        res.status(500).json({ message: 'Failed to post found item.' });
    }
});

// ============================================================
// GET FOUND ITEMS
// ============================================================

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { campusId, category, status, postedBy, search, page = 1, limit = 50 } = req.query;
        const filter = {};

        if (status === 'all') {
            // No status filter
        } else {
            filter.status = status || 'active';
        }

        if (postedBy) filter.postedBy = postedBy;
        if (campusId) filter.campusId = campusId;
        if (category && category !== 'All') filter.category = category;

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }

        const items = await FoundItem.find(filter)
            .populate('postedBy', 'fullName photoURL email')
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        res.json(items);

    } catch (err) {
        console.error('Get Found Items Error:', err.message);
        res.status(500).json({ message: 'Failed to fetch found items.' });
    }
});

// ============================================================
// UPDATE FOUND ITEM
// ============================================================

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const item = await FoundItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found.' });
        }

        // Only owner or admin can update
        if (item.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized.' });
        }

        let { title, description, location, category, image, bounty, priority, isInsured, storedAt } = req.body;

        if (image && image.startsWith('data:')) {
            try {
                image = await uploadBase64(image);
            } catch (e) {
                console.warn('[FOUND-UPDATE] Cloudinary upload failed, keeping base64:', e.message);
            }
        }

        if (title) item.title = title;
        if (description) item.description = description;
        if (location) item.location = location;
        if (category) item.category = category;
        if (image) item.image = image;
        if (bounty !== undefined) item.bounty = bounty;
        if (priority) item.priority = priority;
        if (isInsured !== undefined) item.isInsured = isInsured;
        if (storedAt) item.storedAt = storedAt;

        await item.save();

        // Blockchain log
        logToBlockchain(item._id, 'ITEM_UPDATED', {
            updatedBy: req.user._id
        }).catch(err => console.error('Blockchain log error:', err.message));

        res.json({ message: 'Item updated successfully.', item });

    } catch (err) {
        console.error('Update Found Item Error:', err.message);
        res.status(500).json({ message: 'Failed to update found item.' });
    }
});

// ============================================================
// GET SINGLE FOUND ITEM
// ============================================================

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const item = await FoundItem.findById(req.params.id)
            .populate('postedBy', 'fullName photoURL email phone karmaPoints');

        if (!item) {
            return res.status(404).json({ message: 'Item not found.' });
        }

        // Increment view count
        item.viewCount = (item.viewCount || 0) + 1;
        await item.save();

        res.json(item);

    } catch (err) {
        console.error('Get Found Item Error:', err.message);
        res.status(500).json({ message: 'Failed to fetch item.' });
    }
});

// ============================================================
// MARK AS RESOLVED
// ============================================================

router.patch('/:id/resolve', authMiddleware, async (req, res) => {
    try {
        const item = await FoundItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found.' });
        }

        if (item.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized.' });
        }

        item.status = 'resolved';
        item.resolvedAt = new Date();
        item.resolvedBy = req.user._id;
        await item.save();

        logToBlockchain(item._id, 'ITEM_RESOLVED', {
            resolvedBy: req.user._id
        }).catch(err => console.error('Blockchain log error:', err.message));

        res.json({ message: 'Item marked as resolved.', item });

    } catch (err) {
        console.error('Resolve Error:', err.message);
        res.status(500).json({ message: 'Failed to resolve item.' });
    }
});

// ============================================================
// DELETE ITEM
// ============================================================

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const item = await FoundItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found.' });
        }

        if (item.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized.' });
        }

        await FoundItem.findByIdAndDelete(req.params.id);

        res.json({ message: 'Item deleted successfully.' });

    } catch (err) {
        console.error('Delete Error:', err.message);
        res.status(500).json({ message: 'Failed to delete item.' });
    }
});

module.exports = router;
