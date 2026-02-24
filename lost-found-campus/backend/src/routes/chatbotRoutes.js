const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const ChatbotConversation = require('../models/ChatbotConversation');
const { generateChatbotResponse } = require('../utils/aiService');
const { authMiddleware } = require('../middleware/authMiddleware');

// ============================================================
// SEND MESSAGE TO CHATBOT
// ============================================================

router.post('/message', authMiddleware, async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ message: 'Message is required.' });
        }

        if (message.length > 1000) {
            return res.status(400).json({ message: 'Message is too long. Max 1000 characters.' });
        }

        // Find or create conversation session
        const activeSessionId = sessionId || `session-${req.user._id}-${crypto.randomBytes(4).toString('hex')}`;

        let conversation = await ChatbotConversation.findOne({
            userId: req.user._id,
            sessionId: activeSessionId,
            status: 'active'
        });

        if (!conversation) {
            conversation = await ChatbotConversation.create({
                userId: req.user._id,
                campusId: req.user.campusId?._id || req.user.campusId,
                sessionId: activeSessionId,
                messages: [],
                context: {
                    userRole: req.user.role,
                    lastTopic: null,
                    resolvedQueries: 0
                }
            });
        }

        // Add user message
        conversation.messages.push({
            role: 'user',
            content: message.trim(),
            timestamp: new Date()
        });

        // Generate AI response
        const userContext = {
            userId: req.user._id,
            campusId: req.user.campusId?._id || req.user.campusId,
            userRole: req.user.role,
            userName: req.user.fullName?.split(' ')[0] || 'User'
        };

        const aiResult = await generateChatbotResponse(message, userContext);

        // Add assistant response
        conversation.messages.push({
            role: 'assistant',
            content: aiResult.response,
            timestamp: new Date(),
            metadata: {
                intent: aiResult.intent,
                confidence: aiResult.confidence,
                actionTaken: aiResult.actionTaken,
                itemsReferenced: aiResult.itemsReferenced
            }
        });

        // Update context
        conversation.context.lastTopic = aiResult.intent;
        if (aiResult.actionTaken) {
            conversation.context.resolvedQueries += 1;
        }

        await conversation.save();

        res.json({
            response: aiResult.response,
            intent: aiResult.intent,
            confidence: aiResult.confidence,
            sessionId: activeSessionId,
            actionTaken: aiResult.actionTaken,
            itemsReferenced: aiResult.itemsReferenced
        });

    } catch (err) {
        console.error('Chatbot Error:', err);
        res.status(500).json({ message: 'Chatbot failed to respond. Please try again.' });
    }
});

// ============================================================
// GET CONVERSATION HISTORY
// ============================================================

router.get('/history', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.query;

        if (sessionId) {
            const conversation = await ChatbotConversation.findOne({
                userId: req.user._id,
                sessionId
            });

            if (!conversation) {
                return res.status(404).json({ message: 'Conversation not found.' });
            }

            return res.json(conversation);
        }

        // Return list of conversations
        const conversations = await ChatbotConversation.find({
            userId: req.user._id
        })
            .select('sessionId status context.lastTopic context.resolvedQueries createdAt updatedAt')
            .sort({ updatedAt: -1 })
            .limit(20);

        res.json(conversations);

    } catch (err) {
        console.error('Chatbot History Error:', err);
        res.status(500).json({ message: 'Failed to fetch history.' });
    }
});

// ============================================================
// CLOSE/RATE CONVERSATION
// ============================================================

router.patch('/close', authMiddleware, async (req, res) => {
    try {
        const { sessionId, satisfaction } = req.body;

        if (!sessionId) {
            return res.status(400).json({ message: 'Session ID is required.' });
        }

        const conversation = await ChatbotConversation.findOne({
            userId: req.user._id,
            sessionId
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found.' });
        }

        conversation.status = 'closed';
        conversation.closedAt = new Date();
        if (satisfaction && satisfaction >= 1 && satisfaction <= 5) {
            conversation.satisfaction = satisfaction;
        }

        await conversation.save();

        res.json({ message: 'Conversation closed. Thank you for your feedback!' });

    } catch (err) {
        console.error('Close Conversation Error:', err);
        res.status(500).json({ message: 'Failed to close conversation.' });
    }
});

// ============================================================
// QUICK ACTIONS (Predefined prompts)
// ============================================================

router.get('/quick-actions', authMiddleware, (req, res) => {
    const actions = [
        { id: 'report_lost', label: '🔍 Report Lost Item', prompt: 'I lost something' },
        { id: 'report_found', label: '🎁 Report Found Item', prompt: 'I found something' },
        { id: 'track_claim', label: '📋 Track My Claims', prompt: 'Check my claim status' },
        { id: 'search', label: '🔎 Search Items', prompt: 'Search for items' },
        { id: 'karma', label: '⭐ Karma & Badges', prompt: 'How does karma work?' },
        { id: 'help', label: '❓ Help', prompt: 'Help' },
    ];

    res.json(actions);
});

module.exports = router;
