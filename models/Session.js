const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    accessTokenHash: {
        type: String,
        required: true,
        index: true,
    },
    refreshTokenHash: {
        type: String,
        required: true,
        index: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    userAgent: String,
    lastActivity: {
        type: Date,
        default: Date.now,
        index: true,
    },
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 24 * 60 * 60 * 1000), // 1 day
    }
}, {timestamps: true});

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;