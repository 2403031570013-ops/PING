const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Campus = require('../models/Campus');
const ActivityLog = require('../models/ActivityLog');
const AuditLog = require('../models/AuditLog');
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

// Request OTP
router.post('/request-otp', async (req, res) => {
    console.log(`[DEBUG] Received request-otp: type=${req.body.type}, email=${req.body.email}`);
    try {
        const { email, phone, type } = req.body; // type: 'register' or 'login'

        if (!phone) return res.status(400).json({ message: "Phone number is required" });

        const generatedOTP = "123456"; // Fixed for testing
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        // Find or create temp user record for registration, or find existing for login
        let user = await User.findOne({ email });

        if (type === 'register' && user && user.isPhoneVerified) {
            return res.status(400).json({ message: "User already exists with this email" });
        }

        if (type === 'login' && !user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user) {
            // Create a "skeleton" user for registration flow
            user = new User({
                email,
                phone,
                otp: generatedOTP,
                otpExpires,
                fullName: 'Temporary User', // overwritten on final register
                password: 'temp_password'     // overwritten on final register
            });
        } else {
            user.otp = generatedOTP;
            user.otpExpires = otpExpires;
            user.phone = phone; // update phone if changed before verification
        }

        await user.save();

        console.log(`\n==============================`);
        console.log(`🚀 NEW OTP REQUESTED`);
        console.log(`📧 EMAIL: ${email}`);
        console.log(`📱 PHONE: ${phone}`);
        console.log(`🔑 CODE:  ${generatedOTP}`);
        console.log(`==============================\n`);

        res.json({ message: "OTP sent successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Register
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, phone, campusId, role } = req.body;

        if (!phone) {
            return res.status(400).json({ message: "Mobile number is required" });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser.isPhoneVerified) {
            return res.status(400).json({ message: "User already exists with this email" });
        }

        // Domain Validation (College-only auth)
        if (campusId) {
            const campus = await Campus.findById(campusId);
            if (campus && campus.allowedEmailDomains && campus.allowedEmailDomains.length > 0) {
                const domain = email.split('@')[1];
                if (!campus.allowedEmailDomains.includes(domain)) {
                    return res.status(403).json({
                        message: `Access restricted. Please use your official ${campus.name} email.`
                    });
                }
            }
        }

        const generatedOTP = "123456"; // Fixed for testing
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        const hashedPassword = await User.hashPassword(password);

        let user;
        if (existingUser) {
            user = existingUser;
            user.fullName = fullName;
            user.password = hashedPassword;
            user.phone = phone;
            user.campusId = campusId;
            user.role = role || 'student';
            user.otp = generatedOTP;
            user.otpExpires = otpExpires;
        } else {
            user = new User({
                fullName,
                email,
                password: hashedPassword,
                phone,
                campusId,
                role: role || 'student',
                isApproved: role === 'student' ? true : false,
                isPhoneVerified: false,
                otp: generatedOTP,
                otpExpires: otpExpires
            });
        }
        await user.save();

        console.log(`\n==============================`);
        console.log(`📝 REGISTRATION OTP`);
        console.log(`📧 EMAIL: ${user.email}`);
        console.log(`📱 PHONE: ${phone}`);
        console.log(`🔑 CODE:  ${generatedOTP}`);
        console.log(`==============================\n`);

        res.status(200).json({
            status: 'pending_verification',
            message: "OTP sent to your mobile number",
            email: user.email
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Registration failed", error: error.message });
    }
});


// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password, deviceInfo } = req.body;

        // Find user
        const user = await User.findOne({ email }).populate('campusId');
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Check Password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Check Phone Verification
        if (!user.isPhoneVerified) {
            const generatedOTP = "123456"; // Fixed for testing
            user.otp = generatedOTP;
            user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
            await user.save();

            console.log(`\n==============================`);
            console.log(`🔐 LOGIN OTP (UNVERIFIED)`);
            console.log(`📧 EMAIL: ${user.email}`);
            console.log(`📱 PHONE: ${user.phone}`);
            console.log(`🔑 CODE:  ${generatedOTP}`);
            console.log(`==============================\n`);

            return res.status(200).json({
                status: 'pending_verification',
                message: "Verify your phone number with OTP",
                email: user.email
            });
        }

        // Security Check: Account Suspension
        if (user.status === 'suspended') {
            return res.status(403).json({ message: "Your account has been suspended. Please contact admin." });
        }

        // Security Check: Staff/Admin Approval
        if (!user.isApproved) {
            return res.status(403).json({ message: "Your account is pending approval by campus administrator." });
        }

        // Log Login Activity
        await ActivityLog.create({
            userId: user._id,
            ipAddress: req.ip,
            deviceInfo: deviceInfo || {}
        });

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
                photoURL: user.photoURL,
                status: user.status
            },
            token
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Login failed", error: error.message });
    }
});

// Verify OTP Only (No Login)
router.post('/verify-otp-only', async (req, res) => {
    try {
        const { email, phone, otp } = req.body;
        // Check temp user or find user by phone/email
        let user = await User.findOne({
            $or: [{ email: email }, { phone: phone }]
        });

        if (!user) return res.status(404).json({ message: "User not found or OTP expired" });

        if (user.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // Mark as verified but don't clear OTP yet if we want to ensure register uses it? 
        // Or better: clear it and set a flag.
        user.isPhoneVerified = true;
        // user.otp = undefined; // Keep it valid until final Register call? Or trust the frontend 'isVerified' flag?
        // Trusting frontend is risky. Better to keep it verified in DB.

        await user.save();
        res.json({ message: "Verified successfully" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Verify OTP & Login
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email }).populate('campusId');

        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.otp !== otp) {
            // Allow expired if we just verified it in previous step? No.
            return res.status(400).json({ message: "Invalid OTP" });
        }

        user.isPhoneVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        const token = generateToken(user._id);
        res.json({
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                campusId: user.campusId,
                phone: user.phone,
                photoURL: user.photoURL,
                status: user.status
            },
            token
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Profile
router.get('/profile', verifyToken, (req, res) => {
    res.json(req.dbUser);
});

// Update Profile
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { fullName, phone, campusId, photoURL } = req.body;

        console.log("PUT /profile Body Keys:", Object.keys(req.body));
        if (photoURL) console.log("PhotoURL Length:", photoURL.length);
        else console.log("PhotoURL is missing or empty");

        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (phone) updateData.phone = phone;
        if (campusId) updateData.campusId = campusId;
        if (photoURL) updateData.photoURL = photoURL;

        const updatedUser = await User.findByIdAndUpdate(
            req.dbUser._id,
            { $set: updateData },
            { new: true }
        ).populate('campusId');

        // Debugging Response
        res.json({
            user: updatedUser,
            debug: {
                receivedKeys: Object.keys(req.body),
                photoURLLength: photoURL ? photoURL.length : 'Missing',
                updateDataKeys: Object.keys(updateData)
            }
        });
    } catch (error) {
        console.error("Update profile error:", error);
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
