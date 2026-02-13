const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema({
    campusId: { type: mongoose.Schema.Types.ObjectId, ref: "Campus", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    messages: [
        {
            senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            text: { type: String },
            imageURL: { type: String },
            createdAt: { type: Date, default: Date.now }
        }
    ],
    lastMessage: { type: String },
    lastMessageSenderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    itemType: { type: String },
    itemId: { type: String },    // Optional: Keep for context if needed
    unreadCounts: {
        type: Map,
        of: Number,
        default: {}
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Backward compatibility for frontend which expects 'participants'
ChatSchema.virtual('participants').get(function () {
    return this.members;
});

module.exports = mongoose.model("Chat", ChatSchema);
