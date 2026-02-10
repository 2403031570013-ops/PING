const mongoose = require("mongoose");

const ClaimSchema = new mongoose.Schema({
    itemId: { type: String, required: true },
    itemType: { type: String, enum: ["lost", "found"], required: true },
    claimantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: String,
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Claim", ClaimSchema);
