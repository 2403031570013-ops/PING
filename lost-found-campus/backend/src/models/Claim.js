const mongoose = require("mongoose");

const ClaimSchema = new mongoose.Schema({
    itemId: { type: String, required: true },
    itemType: { type: String, enum: ["lost", "found"], required: true },
    claimantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: String,
    proofImageUrl: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected", "disputed", "completed"], default: "pending" },
    feedback: {
        rating: Number,
        comment: String,
        timestamp: Date
    },
    handoverCode: { type: String }, // 6-digit backup code
    adminNotes: String,
    resolvedAt: Date
}, { timestamps: true });

module.exports = mongoose.model("Claim", ClaimSchema);
