const mongoose = require('mongoose');

/**
 * AI Chatbot Conversation Model
 * Stores conversation history between users and the AI assistant.
 */
const chatbotConversationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    campusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus' },
    sessionId: { type: String, required: true },
    messages: [{
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        metadata: {
            intent: { type: String },
            confidence: { type: Number },
            actionTaken: { type: String },
            itemsReferenced: [{ type: mongoose.Schema.Types.ObjectId }]
        }
    }],
    context: {
        userRole: { type: String },
        lastTopic: { type: String },
        resolvedQueries: { type: Number, default: 0 }
    },
    status: { type: String, enum: ['active', 'closed', 'escalated'], default: 'active' },
    satisfaction: { type: Number, min: 1, max: 5, default: null },
    closedAt: { type: Date, default: null },
}, { timestamps: true });

chatbotConversationSchema.index({ userId: 1, status: 1 });
chatbotConversationSchema.index({ sessionId: 1 });
chatbotConversationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ChatbotConversation', chatbotConversationSchema);
