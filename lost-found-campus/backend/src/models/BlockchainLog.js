const mongoose = require('mongoose');

const BlockchainLogSchema = new mongoose.Schema({
    hash: { type: String, required: true, unique: true }, // The current block hash
    previousHash: { type: String, required: true }, // Chain link
    dataSnapshot: { type: Object, required: true }, // Item details
    timestamp: { type: Date, default: Date.now },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['LostItem', 'FoundItem'], required: true },
    blockIndex: { type: Number, required: true }
});

module.exports = mongoose.model('BlockchainLog', BlockchainLogSchema);
