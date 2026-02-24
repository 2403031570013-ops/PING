const express = require('express');
const router = express.Router();
const User = require('../models/User');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Claim = require('../models/Claim');
const WhatsappLog = require('../models/WhatsappLog');
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/authMiddleware');

// ============================================================
// WHATSAPP BOT COMMAND PROCESSOR
// ============================================================

/**
 * Process incoming WhatsApp commands
 * Supported commands: STATUS, MY ITEMS, HELP, SEARCH <query>
 */
const processCommand = async (command, user) => {
    const cmd = command.toUpperCase().trim();

    if (cmd === 'HELP' || cmd === 'HI' || cmd === 'HELLO') {
        return {
            response: `🎓 *Lost & Found Campus Bot*\n\n` +
                `Available commands:\n\n` +
                `📋 *STATUS* - Check your active claims\n` +
                `📦 *MY ITEMS* - List your posted items\n` +
                `🔍 *SEARCH <item>* - Search for items (e.g., SEARCH laptop)\n` +
                `⭐ *KARMA* - Check your karma points\n` +
                `❓ *HELP* - Show this menu\n\n` +
                `You can also receive automatic notifications about:\n` +
                `• New items matching your reports\n` +
                `• Claim status updates\n` +
                `• Handover code delivery`,
            command: 'HELP'
        };
    }

    if (cmd === 'STATUS') {
        const claims = await Claim.find({
            $or: [{ claimantId: user._id }, { ownerId: user._id }],
            status: { $in: ['pending', 'approved'] }
        }).populate('itemId').limit(5);

        if (claims.length === 0) {
            return {
                response: `📭 No active claims.\n\nUse the app to browse and claim items!`,
                command: 'STATUS'
            };
        }

        let response = `📋 *Your Active Claims (${claims.length})*\n\n`;
        claims.forEach((claim, i) => {
            const emoji = { pending: '⏳', approved: '✅' };
            response += `${i + 1}. ${emoji[claim.status]} *${claim.itemId?.title || 'Item'}*\n`;
            response += `   Status: ${claim.status.toUpperCase()}\n`;
            if (claim.status === 'approved') {
                response += `   🔑 Code: *${claim.handoverCode}*\n`;
            }
            response += '\n';
        });

        return { response, command: 'STATUS' };
    }

    if (cmd === 'MY ITEMS') {
        const [lostItems, foundItems] = await Promise.all([
            LostItem.find({ postedBy: user._id, status: 'active' }).limit(5),
            FoundItem.find({ postedBy: user._id, status: 'active' }).limit(5)
        ]);

        const total = lostItems.length + foundItems.length;
        if (total === 0) {
            return {
                response: `📭 You have no active items posted.\n\nUse the app to report lost or found items!`,
                command: 'MY ITEMS'
            };
        }

        let response = `📦 *Your Items (${total})*\n\n`;

        if (lostItems.length > 0) {
            response += `🔴 *Lost Items:*\n`;
            lostItems.forEach((item, i) => {
                response += `  ${i + 1}. ${item.title} - ${item.location}\n`;
            });
            response += '\n';
        }

        if (foundItems.length > 0) {
            response += `🟢 *Found Items:*\n`;
            foundItems.forEach((item, i) => {
                response += `  ${i + 1}. ${item.title} - ${item.location}\n`;
            });
        }

        return { response, command: 'MY ITEMS' };
    }

    if (cmd === 'KARMA') {
        return {
            response: `⭐ *Your Karma: ${user.karmaPoints || 0} points*\n\n` +
                `Earn karma by:\n` +
                `• Returning found items (+10)\n` +
                `• Reporting found items (+5)\n` +
                `• Getting 5-star feedback (+5)\n\n` +
                `Check the app for your NFT badge collection! 🎖️`,
            command: 'KARMA'
        };
    }

    if (cmd.startsWith('SEARCH ')) {
        const query = command.substring(7).trim();
        if (query.length < 2) {
            return {
                response: `Please provide a search term. Example: *SEARCH laptop*`,
                command: 'SEARCH'
            };
        }

        const campusId = user.campusId;
        const searchFilter = {
            status: 'active',
            ...(campusId ? { campusId } : {}),
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        };

        const [lostResults, foundResults] = await Promise.all([
            LostItem.find(searchFilter).limit(3),
            FoundItem.find(searchFilter).limit(3)
        ]);

        const total = lostResults.length + foundResults.length;
        if (total === 0) {
            return {
                response: `🔍 No items found for "${query}".\n\nTry different keywords or check the app for more options.`,
                command: 'SEARCH'
            };
        }

        let response = `🔍 *Search Results for "${query}" (${total})*\n\n`;

        lostResults.forEach((item, i) => {
            response += `🔴 ${item.title} - ${item.location}\n`;
        });
        foundResults.forEach((item, i) => {
            response += `🟢 ${item.title} - ${item.location}\n`;
        });

        response += `\nOpen the app for details and to submit a claim.`;

        return { response, command: 'SEARCH' };
    }

    // Unknown command
    return {
        response: `❓ Unknown command: "${command}"\n\nType *HELP* to see available commands.`,
        command: 'UNKNOWN'
    };
};

// ============================================================
// WEBHOOK: RECEIVE WHATSAPP MESSAGES
// ============================================================

router.post('/webhook', async (req, res) => {
    try {
        const { from, body, messageId } = req.body;

        if (!from || !body) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        // Clean phone number
        const phoneNumber = from.replace(/[^0-9]/g, '');

        // Find user by phone number
        const user = await User.findOne({
            $or: [
                { phone: phoneNumber },
                { whatsappNumber: phoneNumber },
                { phone: `+${phoneNumber}` }
            ]
        });

        if (!user) {
            // Log unverified message
            await WhatsappLog.create({
                phoneNumber,
                direction: 'inbound',
                messageType: 'command',
                content: body,
                status: 'failed',
                errorMessage: 'Unregistered phone number'
            });

            return res.json({
                reply: `❌ Your phone number is not linked to any account.\n\nPlease add your phone number in the app settings first.`
            });
        }

        // Process command
        const result = await processCommand(body, user);

        // Log inbound message
        await WhatsappLog.create({
            userId: user._id,
            phoneNumber,
            direction: 'inbound',
            messageType: 'command',
            command: result.command,
            content: body,
            waMessageId: messageId,
            status: 'delivered'
        });

        // Log outbound response
        await WhatsappLog.create({
            userId: user._id,
            phoneNumber,
            direction: 'outbound',
            messageType: 'response',
            command: result.command,
            content: result.response,
            status: 'sent'
        });

        res.json({ reply: result.response });

    } catch (err) {
        console.error('WhatsApp Webhook Error:', err);
        res.status(500).json({ message: 'Failed to process message.' });
    }
});

// ============================================================
// SEND NOTIFICATION VIA WHATSAPP (INTERNAL)
// ============================================================

router.post('/send-notification', authMiddleware, async (req, res) => {
    try {
        const { userId, message, templateName } = req.body;

        if (!userId || !message) {
            return res.status(400).json({ message: 'User ID and message are required.' });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const phoneNumber = targetUser.whatsappNumber || targetUser.phone;
        if (!phoneNumber) {
            return res.status(400).json({ message: 'User has no phone number configured.' });
        }

        // In production: Call WhatsApp Business API here
        // For simulation: Log the message
        const log = await WhatsappLog.create({
            userId: targetUser._id,
            phoneNumber,
            direction: 'outbound',
            messageType: 'notification',
            templateName: templateName || null,
            content: message,
            status: 'sent' // In production: 'pending' until confirmed
        });

        console.log(`📱 WhatsApp to ${phoneNumber}: ${message.substring(0, 50)}...`);

        res.json({
            message: 'WhatsApp notification sent (simulated).',
            logId: log._id
        });

    } catch (err) {
        console.error('WhatsApp Send Error:', err);
        res.status(500).json({ message: 'Failed to send WhatsApp notification.' });
    }
});

// ============================================================
// LINK WHATSAPP NUMBER
// ============================================================

router.post('/link', authMiddleware, async (req, res) => {
    try {
        const { whatsappNumber } = req.body;

        if (!whatsappNumber) {
            return res.status(400).json({ message: 'WhatsApp number is required.' });
        }

        // Basic phone number validation
        const cleaned = whatsappNumber.replace(/[^0-9+]/g, '');
        if (cleaned.length < 10) {
            return res.status(400).json({ message: 'Invalid phone number format.' });
        }

        await User.findByIdAndUpdate(req.user._id, {
            whatsappNumber: cleaned,
            whatsappVerified: false
        });

        // Generate verification OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // In production: Send OTP via WhatsApp
        console.log(`📱 WhatsApp verification OTP for ${cleaned}: ${otp}`);

        // Log
        await WhatsappLog.create({
            userId: req.user._id,
            phoneNumber: cleaned,
            direction: 'outbound',
            messageType: 'verification',
            content: `Your Lost & Found verification code is: ${otp}`,
            status: 'sent'
        });

        res.json({
            message: 'Verification code sent to your WhatsApp number.',
            ...(process.env.NODE_ENV !== 'production' && { devOTP: otp })
        });

    } catch (err) {
        console.error('WhatsApp Link Error:', err);
        res.status(500).json({ message: 'Failed to link WhatsApp number.' });
    }
});

// ============================================================
// VERIFY WHATSAPP NUMBER
// ============================================================

router.post('/verify', authMiddleware, async (req, res) => {
    try {
        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({ message: 'Verification code is required.' });
        }

        // For simulation: Accept any 6-digit code in dev mode
        if (process.env.NODE_ENV !== 'production' && otp.length === 6) {
            await User.findByIdAndUpdate(req.user._id, { whatsappVerified: true });
            return res.json({ message: 'WhatsApp number verified successfully!' });
        }

        // In production: Verify against stored OTP
        return res.status(400).json({ message: 'Invalid verification code.' });

    } catch (err) {
        console.error('WhatsApp Verify Error:', err);
        res.status(500).json({ message: 'Verification failed.' });
    }
});

// ============================================================
// GET WHATSAPP LOGS (ADMIN)
// ============================================================

router.get('/logs', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required.' });
        }

        const { page = 1, limit = 50 } = req.query;

        const logs = await WhatsappLog.find()
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await WhatsappLog.countDocuments();

        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (err) {
        console.error('WhatsApp Logs Error:', err);
        res.status(500).json({ message: 'Failed to fetch logs.' });
    }
});

module.exports = router;
