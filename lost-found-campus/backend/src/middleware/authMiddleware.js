const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'lost-found-campus-secret-key-2024';

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: "Database is currently unavailable" });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        // Fetch user from MongoDB
        const dbUser = await User.findById(decoded.userId).populate('campusId');

        if (!dbUser) {
            return res.status(401).json({ message: "Account no longer exists" });
        }

        // Security: Immediate lockout for suspended users
        if (dbUser.status === 'suspended') {
            return res.status(403).json({ message: "Account suspended by administrator" });
        }

        req.user = decoded;
        req.dbUser = dbUser;
        next();
    } catch (error) {
        console.error("Auth Fail:", error.message);
        return res.status(401).json({ message: "Token expired or invalid" });
    }
};

module.exports = verifyToken;
