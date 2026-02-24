const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Claim = require('../models/Claim');
const crypto = require('crypto');

/**
 * AI Service Module
 * Provides intelligent item matching, chatbot responses, and image analysis.
 * Uses rule-based NLP with simulated embeddings (no external AI API required).
 */

// ============================================================
// 1. IMAGE EMBEDDING & MATCHING (SIMULATED)
// ============================================================

/**
 * Generate a simulated embedding vector for an image
 * In production, this would call a vision API (e.g., CLIP, ResNet)
 */
const generateImageEmbedding = async (imageBase64) => {
    // Simulate a 128-dimensional embedding based on image hash
    const hash = crypto.createHash('sha256').update(imageBase64 || 'default').digest('hex');
    const embedding = [];
    for (let i = 0; i < 128; i++) {
        const hexPair = hash.substring(i % 64, (i % 64) + 2);
        embedding.push((parseInt(hexPair, 16) / 255) - 0.5); // Normalize to [-0.5, 0.5]
    }
    return embedding;
};

/**
 * Calculate cosine similarity between two embeddings
 */
const cosineSimilarity = (vecA, vecB) => {
    if (!vecA?.length || !vecB?.length || vecA.length !== vecB.length) return 0;
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
};

/**
 * Simulated face detection (returns true if image might contain a face)
 */
const detectFace = async (imageBase64) => {
    // Simulate: ~30% chance of "detecting" a face
    const hash = crypto.createHash('md5').update(imageBase64 || '').digest('hex');
    return parseInt(hash.substring(0, 2), 16) < 77;
};

/**
 * Simulated face matching
 */
const matchFaces = async (face1Base64, face2Base64) => {
    const similarity = Math.random() * 0.4 + 0.3; // 30-70% match
    return { match: similarity > 0.6, confidence: similarity };
};

// ============================================================
// 2. TEXT MATCHING ENGINE
// ============================================================

/**
 * Extract meaningful keywords from text
 */
const extractKeywords = (text) => {
    if (!text) return [];
    const stopWords = new Set([
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'my', 'i', 'it', 'and', 'or', 'but', 'not', 'this',
        'that', 'very', 'just', 'have', 'has', 'had', 'been', 'lost', 'found', 'item',
        'please', 'help', 'looking', 'someone', 'near', 'around', 'campus', 'today'
    ]);

    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));
};

/**
 * Calculate text similarity score between two items
 */
const calculateTextSimilarity = (item1, item2) => {
    const words1 = [
        ...extractKeywords(item1.title),
        ...extractKeywords(item1.description)
    ];
    const words2 = [
        ...extractKeywords(item2.title),
        ...extractKeywords(item2.description)
    ];

    if (words1.length === 0 || words2.length === 0) return 0;

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    let matchCount = 0;
    for (const word of set1) {
        if (set2.has(word)) matchCount++;
    }

    // Jaccard similarity
    const union = new Set([...set1, ...set2]);
    return union.size > 0 ? matchCount / union.size : 0;
};

/**
 * Calculate overall match score between two items (0-100)
 */
const calculateMatchScore = (lostItem, foundItem) => {
    let score = 0;
    let factors = [];

    // 1. Category match (30 points)
    if (lostItem.category === foundItem.category) {
        score += 30;
        factors.push('Same category');
    }

    // 2. Text similarity (40 points max)
    const textSim = calculateTextSimilarity(lostItem, foundItem);
    const textScore = Math.round(textSim * 40);
    score += textScore;
    if (textScore > 10) factors.push(`Text similarity: ${Math.round(textSim * 100)}%`);

    // 3. Location proximity (20 points)
    if (lostItem.location && foundItem.location) {
        const locWords1 = extractKeywords(lostItem.location);
        const locWords2 = extractKeywords(foundItem.location);
        const locMatch = locWords1.some(w => locWords2.includes(w));
        if (locMatch) {
            score += 20;
            factors.push('Similar location');
        }
    }

    // 4. Time proximity (10 points - items posted within 7 days of each other)
    const timeDiff = Math.abs(
        new Date(lostItem.createdAt).getTime() - new Date(foundItem.createdAt).getTime()
    );
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    if (daysDiff <= 1) {
        score += 10;
        factors.push('Posted same day');
    } else if (daysDiff <= 3) {
        score += 7;
        factors.push('Posted within 3 days');
    } else if (daysDiff <= 7) {
        score += 4;
        factors.push('Posted within a week');
    }

    return { score: Math.min(score, 100), factors };
};

// ============================================================
// 3. AI CHATBOT ENGINE
// ============================================================

/**
 * Intent classification for chatbot messages
 */
const classifyIntent = (message) => {
    const text = message.toLowerCase().trim();

    const intents = [
        { intent: 'report_lost', patterns: ['lost', 'missing', 'can\'t find', 'misplaced', 'forgot', 'left behind'] },
        { intent: 'report_found', patterns: ['found', 'picked up', 'someone left', 'lying', 'unclaimed'] },
        { intent: 'track_claim', patterns: ['claim status', 'my claim', 'handover', 'when will', 'tracking', 'status of'] },
        { intent: 'search_item', patterns: ['search', 'looking for', 'anyone found', 'has anyone', 'check if'] },
        { intent: 'help', patterns: ['help', 'how to', 'how do i', 'what is', 'explain', 'guide', 'tutorial'] },
        { intent: 'greeting', patterns: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'] },
        { intent: 'karma', patterns: ['karma', 'points', 'reward', 'leaderboard', 'rank', 'badge', 'nft'] },
        { intent: 'location', patterns: ['where', 'location', 'map', 'building', 'library', 'canteen', 'hostel'] },
        { intent: 'contact', patterns: ['contact', 'reach', 'admin', 'security', 'desk', 'phone', 'email'] },
        { intent: 'thanks', patterns: ['thank', 'thanks', 'appreciate', 'helpful', 'great'] },
        { intent: 'goodbye', patterns: ['bye', 'goodbye', 'see you', 'later', 'close'] },
    ];

    let bestMatch = { intent: 'unknown', confidence: 0 };

    for (const { intent, patterns } of intents) {
        const matchCount = patterns.filter(p => text.includes(p)).length;
        const confidence = matchCount / patterns.length;
        if (confidence > bestMatch.confidence) {
            bestMatch = { intent, confidence: Math.min(confidence * 1.5, 1) };
        }
    }

    // Minimum confidence threshold
    if (bestMatch.confidence < 0.15) {
        bestMatch = { intent: 'unknown', confidence: 0 };
    }

    return bestMatch;
};

/**
 * Generate chatbot response based on intent and context
 */
const generateChatbotResponse = async (message, userContext = {}) => {
    const { intent, confidence } = classifyIntent(message);
    const { userId, campusId, userRole, userName } = userContext;

    let response = '';
    let actionTaken = null;
    let itemsReferenced = [];

    switch (intent) {
        case 'greeting': {
            const greetings = [
                `Hi ${userName || 'there'}! 👋 I'm your Lost & Found assistant. How can I help you today?`,
                `Hello ${userName || ''}! 🎓 Need help finding something or reporting a found item?`,
                `Hey! 😊 I'm here to help with lost and found items on campus. What do you need?`
            ];
            response = greetings[Math.floor(Math.random() * greetings.length)];
            break;
        }

        case 'report_lost': {
            response = `I'm sorry to hear you lost something! 😟 Here's how to report it:\n\n` +
                `1️⃣ Tap the **"Report Item"** button on the home screen\n` +
                `2️⃣ Select **"Lost Item"**\n` +
                `3️⃣ Add a clear photo and detailed description\n` +
                `4️⃣ Specify the **exact location** where you last had it\n\n` +
                `💡 **Pro Tip:** Include unique identifiers like serial numbers, stickers, or scratches. ` +
                `The more specific you are, the faster we can match it!\n\n` +
                `I'll also automatically search for matching found items and notify you if there's a match.`;
            actionTaken = 'guided_report_lost';
            break;
        }

        case 'report_found': {
            response = `Great job being a good citizen! 🌟 To report a found item:\n\n` +
                `1️⃣ Tap **"Report Item"** on the home screen\n` +
                `2️⃣ Select **"Found Item"**\n` +
                `3️⃣ Take a clear photo of the item\n` +
                `4️⃣ Mark the **location** where you found it\n\n` +
                `🏢 **Important:** Please deliver the item to the nearest **Security Desk** after reporting.\n\n` +
                `You'll earn **Karma points** and may even receive an **NFT badge** for your good deed! 🎖️`;
            actionTaken = 'guided_report_found';
            break;
        }

        case 'track_claim': {
            // Try to fetch user's active claims
            if (userId) {
                try {
                    const claims = await Claim.find({
                        $or: [{ claimantId: userId }, { ownerId: userId }],
                        status: { $in: ['pending', 'approved'] }
                    }).populate('itemId').limit(5);

                    if (claims.length > 0) {
                        response = `📋 Here are your active claims:\n\n`;
                        claims.forEach((claim, i) => {
                            const statusEmoji = {
                                pending: '⏳', approved: '✅', rejected: '❌', completed: '🎉'
                            };
                            response += `${i + 1}. **${claim.itemId?.title || 'Item'}** - ${statusEmoji[claim.status] || '❓'} ${claim.status.toUpperCase()}\n`;
                            if (claim.status === 'approved') {
                                response += `   🔑 Handover Code: **${claim.handoverCode}**\n`;
                            }
                        });
                        response += `\nGo to **"My Handover Requests"** in your profile for full details.`;
                        itemsReferenced = claims.map(c => c.itemId?._id).filter(Boolean);
                    } else {
                        response = `You don't have any active claims right now. 📭\n\n` +
                            `To claim an item, browse the listings and tap **"Claim"** on a matching item.`;
                    }
                } catch (err) {
                    response = `I couldn't fetch your claims right now. Please try the **"My Handover Requests"** section in your profile.`;
                }
            } else {
                response = `To check your claim status, go to **Profile → My Handover Requests**. ` +
                    `You'll see all your pending, approved, and completed claims there.`;
            }
            actionTaken = 'track_claim';
            break;
        }

        case 'search_item': {
            if (userId && campusId) {
                try {
                    const keywords = extractKeywords(message);
                    const searchQuery = keywords.join(' ');

                    const [lostItems, foundItems] = await Promise.all([
                        LostItem.find({
                            campusId,
                            status: 'active',
                            $text: { $search: searchQuery }
                        }).limit(5).sort({ score: { $meta: 'textScore' } }),
                        FoundItem.find({
                            campusId,
                            status: 'active',
                            $text: { $search: searchQuery }
                        }).limit(5).sort({ score: { $meta: 'textScore' } })
                    ]);

                    const total = lostItems.length + foundItems.length;
                    if (total > 0) {
                        response = `🔍 I found **${total} items** matching your description:\n\n`;
                        if (lostItems.length > 0) {
                            response += `**Lost Items:**\n`;
                            lostItems.forEach((item, i) => {
                                response += `  ${i + 1}. 🔴 ${item.title} - ${item.location}\n`;
                            });
                        }
                        if (foundItems.length > 0) {
                            response += `\n**Found Items:**\n`;
                            foundItems.forEach((item, i) => {
                                response += `  ${i + 1}. 🟢 ${item.title} - ${item.location}\n`;
                            });
                        }
                        response += `\nCheck the **Browse** tab for details and to submit a claim.`;
                        itemsReferenced = [...lostItems.map(i => i._id), ...foundItems.map(i => i._id)];
                    } else {
                        response = `No matching items found right now. 😕\n\n` +
                            `Try posting a **Lost Report** with detailed description. ` +
                            `I'll automatically notify you when a matching item is found!`;
                    }
                } catch (err) {
                    response = `I couldn't search right now. Please use the **search bar** on the home screen to browse items.`;
                }
            } else {
                response = `Use the **search bar** on the home screen to find items by name or location. ` +
                    `You can also filter by category!`;
            }
            actionTaken = 'search_item';
            break;
        }

        case 'karma': {
            response = `🌟 **Karma System & NFT Badges**\n\n` +
                `Earn karma points by helping the campus community:\n\n` +
                `• 🔍 **Report a found item:** +5 karma\n` +
                `• 🤝 **Successful handover:** +10 karma\n` +
                `• ⭐ **5-star feedback:** +15 karma\n` +
                `• 🏆 **Top contributor bonus:** +25 karma\n\n` +
                `**NFT Badges** 🎖️\n` +
                `Complete achievements to mint exclusive NFT badges:\n` +
                `• 🥉 First Return Badge\n` +
                `• 🥈 Good Samaritan (5 returns)\n` +
                `• 🥇 Campus Guardian (10 returns)\n\n` +
                `Check the **Leaderboard** to see your ranking!`;
            actionTaken = 'karma_info';
            break;
        }

        case 'location': {
            response = `📍 **Campus Locations Guide**\n\n` +
                `Common Lost & Found hotspots:\n\n` +
                `🏫 **Academic:** PIT Engineering, Central Library, Admin Block\n` +
                `🍔 **Food Court:** Putulik Food Court, Nescafe Point\n` +
                `🏠 **Hostels:** Teresa, Atal, Tagore, Indira\n` +
                `⚽ **Sports:** Cricket Ground, Basketball Court\n` +
                `🏥 **Hospital:** Parul Sevashram Hospital\n\n` +
                `Use the **Campus Map** feature to see item hotspots and navigate!`;
            actionTaken = 'location_info';
            break;
        }

        case 'contact': {
            response = `📞 **Contact Information**\n\n` +
                `🔒 **Security Desk:** Available 24/7 at the main gate\n` +
                `📧 **Admin:** admin@paruluniversity.ac.in\n` +
                `📱 **App Support:** Use the in-app chat or report feature\n\n` +
                `For urgent matters, visit the **Security Desk** in person.`;
            actionTaken = 'contact_info';
            break;
        }

        case 'help': {
            response = `📖 **How to Use Lost & Found Campus**\n\n` +
                `Here's what I can help you with:\n\n` +
                `🔍 **"I lost something"** - Guide you to report a lost item\n` +
                `🎁 **"I found something"** - Help you report a found item\n` +
                `📋 **"Check my claims"** - Show your active handover requests\n` +
                `🔎 **"Search for [item]"** - Search the database for items\n` +
                `⭐ **"How does karma work?"** - Explain the reward system\n` +
                `📍 **"Where is [location]?"** - Campus location info\n` +
                `📞 **"Contact admin"** - Get contact information\n\n` +
                `Just type naturally and I'll do my best to help! 😊`;
            actionTaken = 'show_help';
            break;
        }

        case 'thanks': {
            const replies = [
                `You're welcome! 😊 Happy to help. Let me know if you need anything else!`,
                `Glad I could help! 🎉 Don't forget to check the app regularly for updates on your items.`,
                `Anytime! 💪 Together we make campus a better place.`
            ];
            response = replies[Math.floor(Math.random() * replies.length)];
            break;
        }

        case 'goodbye': {
            response = `Goodbye! 👋 Remember to check back if you've reported an item. Good luck! 🍀`;
            break;
        }

        default: {
            response = `I'm not sure I understand that. 🤔 Here are some things you can ask me:\n\n` +
                `• "I lost my laptop"\n` +
                `• "I found a phone"\n` +
                `• "Check my claim status"\n` +
                `• "Search for keys"\n` +
                `• "How does karma work?"\n` +
                `• "Help"\n\n` +
                `Try rephrasing your question, or type **"help"** for a full guide!`;
            break;
        }
    }

    return {
        response,
        intent,
        confidence,
        actionTaken,
        itemsReferenced
    };
};

module.exports = {
    generateImageEmbedding,
    cosineSimilarity,
    detectFace,
    matchFaces,
    extractKeywords,
    calculateTextSimilarity,
    calculateMatchScore,
    classifyIntent,
    generateChatbotResponse
};
