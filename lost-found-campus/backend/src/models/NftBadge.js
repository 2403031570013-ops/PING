const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * NFT Badge Model (Simulated)
 * Tracks achievement badges awarded to users for good deeds.
 * No real blockchain — badges are stored in MongoDB with simulated hashes.
 */
const nftBadgeSchema = new mongoose.Schema({
    badgeId: {
        type: String,
        unique: true,
        default: () => `NFT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    },
    name: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, default: null },
    tier: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum', 'legendary'],
        default: 'bronze'
    },

    // Ownership
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    campusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus' },

    // Linked item resolution
    itemId: { type: mongoose.Schema.Types.ObjectId },
    itemType: { type: String, enum: ['LostItem', 'FoundItem'] },
    claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim' },

    // Simulated blockchain data
    txHash: {
        type: String,
        default: () => `0x${crypto.randomBytes(32).toString('hex')}`
    },
    blockNumber: { type: Number, default: () => Math.floor(Math.random() * 1000000) + 18000000 },
    contractAddress: {
        type: String,
        default: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18'
    },
    tokenId: { type: Number, default: null },

    // Metadata (ERC-721 compatible)
    metadata: {
        attributes: [{
            trait_type: { type: String },
            value: { type: mongoose.Schema.Types.Mixed }
        }],
        external_url: { type: String, default: null }
    },

    // Minting status
    status: { type: String, enum: ['minting', 'minted', 'revoked'], default: 'minted' },

    awardedAt: { type: Date, default: Date.now },
}, { timestamps: true });

nftBadgeSchema.index({ ownerId: 1 });
nftBadgeSchema.index({ campusId: 1 });
nftBadgeSchema.index({ tier: 1 });

/**
 * Badge Types Registry (Static catalog)
 */
nftBadgeSchema.statics.BADGE_CATALOG = {
    FIRST_RETURN: {
        name: '🎖️ First Return',
        description: 'Successfully returned your first found item to its owner.',
        tier: 'bronze',
        karma: 10
    },
    GOOD_SAMARITAN: {
        name: '🤝 Good Samaritan',
        description: 'Returned 5 items to grateful owners. A true campus hero!',
        tier: 'silver',
        karma: 25
    },
    CAMPUS_GUARDIAN: {
        name: '🛡️ Campus Guardian',
        description: 'Returned 10+ items. The campus is safer because of you.',
        tier: 'gold',
        karma: 50
    },
    LEGENDARY_FINDER: {
        name: '👑 Legendary Finder',
        description: 'Returned 25+ items. You are a living legend on campus.',
        tier: 'platinum',
        karma: 100
    },
    STREAK_MASTER: {
        name: '🔥 Streak Master',
        description: 'Returned items 7 days in a row. Incredible dedication!',
        tier: 'gold',
        karma: 30
    },
    SPEED_DEMON: {
        name: '⚡ Speed Demon',
        description: 'Resolved a claim within 1 hour of posting. Lightning fast!',
        tier: 'silver',
        karma: 20
    },
    VERIFIED_HERO: {
        name: '✅ Verified Hero',
        description: 'Completed 5 verified handovers with QR code.',
        tier: 'gold',
        karma: 40
    },
    COMMUNITY_STAR: {
        name: '⭐ Community Star',
        description: 'Received a 5-star feedback from an item owner.',
        tier: 'bronze',
        karma: 15
    },
};

/**
 * Mint a new NFT badge for a user
 */
nftBadgeSchema.statics.mintBadge = async function (badgeKey, userId, itemData = {}) {
    const catalog = this.BADGE_CATALOG[badgeKey];
    if (!catalog) throw new Error(`Unknown badge type: ${badgeKey}`);

    // Check if user already has this specific badge for this item
    if (itemData.itemId) {
        const existing = await this.findOne({
            ownerId: userId,
            name: catalog.name,
            itemId: itemData.itemId
        });
        if (existing) return existing; // Don't duplicate
    }

    const tokenId = await this.countDocuments() + 1;

    const badge = await this.create({
        name: catalog.name,
        description: catalog.description,
        tier: catalog.tier,
        ownerId: userId,
        campusId: itemData.campusId || null,
        itemId: itemData.itemId || null,
        itemType: itemData.itemType || null,
        claimId: itemData.claimId || null,
        tokenId,
        metadata: {
            attributes: [
                { trait_type: 'Badge Type', value: badgeKey },
                { trait_type: 'Tier', value: catalog.tier },
                { trait_type: 'Karma Value', value: catalog.karma },
                { trait_type: 'Campus', value: itemData.campusName || 'Unknown' },
            ]
        }
    });

    return badge;
};

module.exports = mongoose.model('NftBadge', nftBadgeSchema);
