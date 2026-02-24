const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication Middleware
 * Verifies JWT token, checks user status, and attaches user to request.
 */
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        const token = authHeader.split(' ')[1];

        if (!token || token === 'null' || token === 'undefined') {
            return res.status(401).json({ message: 'Access denied. Invalid token format.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired. Please login again.', code: 'TOKEN_EXPIRED' });
            }
            if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Invalid token.', code: 'TOKEN_INVALID' });
            }
            return res.status(401).json({ message: 'Token verification failed.' });
        }

        // Fetch user from DB (exclude password)
        const user = await User.findById(decoded.id)
            .select('-password -refreshToken -otp -otpExpires')
            .populate('campusId');

        if (!user) {
            return res.status(401).json({ message: 'User not found. Account may have been deleted.' });
        }

        // Check account status
        if (user.status === 'suspended') {
            return res.status(403).json({
                message: 'Your account has been suspended. Contact campus administration.',
                code: 'ACCOUNT_SUSPENDED'
            });
        }

        if (user.status === 'banned') {
            return res.status(403).json({
                message: 'Your account has been banned.',
                code: 'ACCOUNT_BANNED'
            });
        }

        // Attach user to request
        req.user = user;
        req.userId = user._id;
        next();
    } catch (err) {
        console.error('Auth Middleware Error:', err.message);
        return res.status(500).json({ message: 'Server authentication error.' });
    }
};

/**
 * Role-based access control middleware
 * Usage: requireRole('admin') or requireRole('admin', 'staff')
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied. Required role: ${roles.join(' or ')}`,
                code: 'INSUFFICIENT_ROLE'
            });
        }
        next();
    };
};

/**
 * Optional auth middleware (doesn't fail if no token)
 * Useful for public endpoints that show extra data for logged-in users
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // Continue without user
        }

        const token = authHeader.split(' ')[1];
        if (!token || token === 'null') return next();

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id)
            .select('-password -refreshToken -otp -otpExpires')
            .populate('campusId');

        if (user && user.status === 'active') {
            req.user = user;
            req.userId = user._id;
        }
    } catch (err) {
        // Silent fail for optional auth
    }
    next();
};

module.exports = { authMiddleware, requireRole, optionalAuth };
