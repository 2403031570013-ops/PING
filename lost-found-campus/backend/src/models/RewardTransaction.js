const mongoose = require('mongoose');

const RewardTransactionSchema = new mongoose.Schema({
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'itemType' },
    itemType: { type: String, enum: ['LostItem', 'FoundItem'], required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    blockchainTxHash: { type: String }, // Blockchain simulation
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RewardTransaction', RewardTransactionSchema);
