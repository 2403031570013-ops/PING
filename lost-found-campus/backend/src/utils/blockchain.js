const crypto = require('crypto');
const BlockchainLog = require('../models/BlockchainLog');

/**
 * Simulates adding a block to a blockchain.
 * This function calculates the hash of the item data and the previous block's hash.
 * @param {Object} item - The item object (LostItem or FoundItem)
 * @param {String} itemType - 'LostItem' or 'FoundItem'
 */
const logToBlockchain = async (item, itemType) => {
    try {
        // 1. Get the last block in the chain (globally or per-item? Let's verify prompt: "Store hash in immutable log")
        // Usually a single chain for the whole system makes sense for "Proof Log".
        const lastBlock = await BlockchainLog.findOne().sort({ blockIndex: -1 });

        const previousHash = lastBlock ? lastBlock.hash : "0000000000000000000000000000000000000000000000000000000000000000";
        const blockIndex = lastBlock ? lastBlock.blockIndex + 1 : 0;

        // 2. Prepare data for hashing
        const blockData = {
            itemId: item._id.toString(),
            title: item.title,
            description: item.description,
            timestamp: new Date().toISOString(),
            previousHash
        };

        // 3. Calculate SHA256 Hash
        const dataString = JSON.stringify(blockData);
        const hash = crypto.createHash('sha256').update(dataString).digest('hex');

        // 4. Create new Block
        const newBlock = new BlockchainLog({
            hash,
            previousHash,
            dataSnapshot: blockData,
            itemId: item._id,
            type: itemType,
            blockIndex
        });

        await newBlock.save();

        console.log(`[Blockchain] Block #${blockIndex} mined: ${hash}`);
        return hash;
    } catch (error) {
        console.error("[Blockchain] Error mining block:", error);
        return null;
    }
};

module.exports = { logToBlockchain };
