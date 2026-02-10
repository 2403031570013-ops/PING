const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Campus = require('../models/Campus');
const verifyToken = require('../middleware/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'lost-found-campus-secret-key-2024';

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
};

// Get Campuses
router.get('/campuses', async (req, res) => {
    try {
        const campuses = await Campus.find({ isActive: true });
        res.json(campuses);
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message });
    }
});

// Register
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, phone } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists with this email" });
        }

        // Hash password
        const hashedPassword = await User.hashPassword(password);

        // Create new user
        const user = new User({
            fullName,
            email,
            password: hashedPassword,
            phone: phone || ""
        });
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                campusId: user.campusId
            },
            token
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Registration failed", error: error.message });
    }
});


// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email }).populate('campusId');
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Generate token
        const token = generateToken(user._id);

        res.json({
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                campusId: user.campusId,
                phone: user.phone,
                photoURL: user.photoURL
            },
            token
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Login failed", error: error.message });
    }
});

// Get Profile
router.get('/profile', verifyToken, (req, res) => {
    res.json(req.dbUser);
});

// Update Profile
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { fullName, phone, campusId } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.dbUser._id,
            { fullName, phone, campusId },
            { new: true }
        ).populate('campusId');
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: "Failed", error: error.message });
    }
});

// Save Push Token
router.post('/push-token', verifyToken, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.dbUser._id, { pushToken: req.body.pushToken });
        res.json({ message: "Saved" });
    } catch (error) {
        res.status(500).json({ message: "Failed", error: error.message });
    }
});

// Get Leaderboard (Top 10 Karma)
router.get('/leaderboard', async (req, res) => {
    try {
        const topUsers = await User.find({})
            .sort({ karmaPoints: -1 }) // Highest first
            .limit(10)
            .select('fullName photoURL karmaPoints role campusId');
        res.json(topUsers);
    } catch (error) {
        res.status(500).json({ message: "Error fetching leaderboard", error: error.message });
    }
});

module.exports = router;
