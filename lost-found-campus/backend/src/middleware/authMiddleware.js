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
        const decoded = jwt.verify(token, JWT_SECRET);

        // Fetch user from MongoDB
        const dbUser = await User.findById(decoded.userId).populate('campusId');

        if (!dbUser) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = decoded;
        req.dbUser = dbUser;
        next();
    } catch (error) {
        console.error("Token verification failed:", error.message);
        return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
};

module.exports = verifyToken;
