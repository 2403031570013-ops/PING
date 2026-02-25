const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Campus = require('../models/Campus');
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware } = require('../middleware/authMiddleware');
const { sendOTPEmail } = require('../utils/emailService');

// ============================================================
// HELPERS
// ============================================================

/**
 * Generate a random 6-digit OTP
 */
const generateOTP = () => {
    // In development/test mode, use a predictable OTP for ease of use
    if (process.env.NODE_ENV !== 'production') return '654321';
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Generate JWT access token (short-lived)
 */
const generateAccessToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Generate JWT refresh token (long-lived)
 */
const generateRefreshToken = (userId) => {
    return jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

/**
 * Check if OTP is locked (brute-force prevention)
 */
const isOTPLocked = (user) => {
    if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
        const minutesLeft = Math.ceil((user.otpLockedUntil - new Date()) / 60000);
        return { locked: true, minutesLeft };
    }
    return { locked: false };
};

/**
 * Log activity (login, logout, etc.)
 */
const logActivity = async (userId, action, details = {}) => {
    try {
        await ActivityLog.create({
            userId,
            action,
            ...details,
            timestamp: new Date()
        });
    } catch (err) {
        console.error('Activity log error:', err.message);
    }
};

// ============================================================
// DEBUG
// ============================================================
router.get('/ping', (req, res) => res.json({ message: 'pong', timestamp: new Date() }));

// ============================================================
// GOOGLE AUTHENTICATION
// ============================================================

/**
 * Handle Google Sign-In / Sign-Up
 * In production, you MUST verify the idToken from Google on the server.
 * For this implementation, we accept user details and either find or create the user.
 */
router.post('/google', async (req, res) => {
    console.log(`[AUTH] Google login attempt: ${req.body.email}`);
    try {
        const { googleId, email, fullName, photoURL } = req.body;

        if (!googleId || !email) {
            return res.status(400).json({ message: 'Google ID and Email are required.' });
        }

        // 1. Try to find user by googleId
        let user = await User.findOne({ googleId });

        // 2. If not found, try to find by email (to link existing account)
        if (!user) {
            user = await User.findOne({ email: email.toLowerCase().trim() });

            if (user) {
                // Link Google account to existing email account
                user.googleId = googleId;
                if (!user.photoURL && photoURL) user.photoURL = photoURL;
                await user.save();
                console.log(`[AUTH] Linked Google ID to existing user: ${email}`);
            }
        }

        // 3. If still not found, create new user
        if (!user) {
            // Generate a random password since it's required by the model
            const randomPassword = crypto.randomBytes(16).toString('hex');

            user = await User.create({
                googleId,
                email: email.toLowerCase().trim(),
                fullName: fullName || "Google Member",
                photoURL,
                password: randomPassword,
                isPhoneVerified: true,
                isApproved: true,
                status: 'active'
            });
            console.log(`[AUTH] Created new Google user: ${email}`);
        }

        // 4. Check if account is active
        if (user.status !== 'active') {
            return res.status(403).json({ message: `Account is ${user.status}.` });
        }

        // 5. Generate tokens
        const token = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Update login stats
        user.refreshToken = refreshToken;
        user.lastLoginAt = new Date();
        user.loginCount = (user.loginCount || 0) + 1;
        await user.save();

        await logActivity(user._id, 'login_google', { ipAddress: req.ip });

        res.json({
            message: 'Logged in with Google successfully!',
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                photoURL: user.photoURL,
                campusId: user.campusId,
                karmaPoints: user.karmaPoints,
                whatsappNumber: user.whatsappNumber
            },
            token
        });

    } catch (err) {
        console.error('Google Auth Error:', err);
        res.status(500).json({ message: 'Google authentication failed.' });
    }
});

// ============================================================
// REGISTRATION
// ============================================================

router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, campusId, role } = req.body;

        // Validate required fields
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'Full name, email, and password are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        // Check duplicate email
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        // Validate campus if provided
        let campus = null;
        if (campusId) {
            campus = await Campus.findById(campusId);
            if (!campus) {
                return res.status(400).json({ message: 'Invalid campus selected.' });
            }

            // Check email domain restriction
            if (campus.allowedEmailDomains && campus.allowedEmailDomains.length > 0) {
                const emailDomain = email.split('@')[1];
                if (!campus.allowedEmailDomains.includes(emailDomain)) {
                    return res.status(400).json({
                        message: `Registration requires a valid institutional email. Allowed domains: ${campus.allowedEmailDomains.join(', ')}`
                    });
                }
            }
        }

        // Determine role (prevent self-promotion to admin)
        const userRole = (role === 'staff') ? 'staff' : 'student';
        const needsApproval = campus?.settings?.requireStaffApproval && userRole === 'staff';

        // Create user — auto-verified for seamless onboarding
        const newUser = await User.create({
            fullName: fullName.trim(),
            email: email.toLowerCase().trim(),
            password,
            role: userRole,
            campusId: campusId || null,
            isPhoneVerified: true,
            isApproved: !needsApproval,
            status: 'active'
        });

        // Generate tokens immediately (no OTP step)
        const accessToken = generateAccessToken(newUser._id);
        const refreshToken = generateRefreshToken(newUser._id);
        newUser.refreshToken = refreshToken;
        newUser.lastLoginAt = new Date();
        newUser.loginCount = 1;
        await newUser.save();

        await logActivity(newUser._id, 'register', { ipAddress: req.ip });

        const userObj = newUser.toObject();
        delete userObj.password;
        delete userObj.otp;
        delete userObj.refreshToken;

        res.status(201).json({
            message: 'Account created successfully! Welcome aboard!',
            token: accessToken,
            refreshToken,
            user: userObj
        });

    } catch (err) {
        console.error('Registration Error:', err);
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Email already registered.' });
        }
        res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
});

// ============================================================
// OTP VERIFICATION
// ============================================================

router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'Account not found.' });
        }

        // Check OTP lockout
        const lockStatus = isOTPLocked(user);
        if (lockStatus.locked) {
            return res.status(429).json({
                message: `Too many attempts. Try again in ${lockStatus.minutesLeft} minutes.`
            });
        }

        // Verify OTP (Cast to string and trim to be safe)
        if (String(user.otp) !== String(otp).trim()) {
            // Increment attempts
            user.otpAttempts = (user.otpAttempts || 0) + 1;
            console.log(`[AUTH] Invalid registration OTP for ${email}. Expected: ${user.otp}, Got: ${otp}`);

            // Lock after 5 failed attempts
            if (user.otpAttempts >= 5) {
                user.otpLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
                user.otpAttempts = 0;
                await user.save();
                return res.status(429).json({ message: 'Too many failed attempts. Account locked for 15 minutes.' });
            }

            await user.save();
            return res.status(400).json({
                message: `Invalid OTP. ${5 - user.otpAttempts} attempts remaining.`
            });
        }

        // Check OTP expiry
        if (user.otpExpires && user.otpExpires < new Date()) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        // Mark as verified
        user.isPhoneVerified = true;
        user.otp = null;
        user.otpExpires = null;
        user.otpAttempts = 0;
        user.otpLockedUntil = null;
        await user.save();

        // Generate tokens
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Store refresh token
        user.refreshToken = refreshToken;
        await user.save();

        await logActivity(user._id, 'verify_otp', { ipAddress: req.ip });

        res.json({
            message: 'OTP verified successfully!',
            token: accessToken,
            refreshToken,
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                campusId: user.campusId,
                isApproved: user.isApproved,
                karmaPoints: user.karmaPoints
            }
        });

    } catch (err) {
        console.error('OTP Verification Error:', err);
        res.status(500).json({ message: 'Verification failed.' });
    }
});

// ============================================================
// RESEND OTP
// ============================================================

router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required.' });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ message: 'Account not found.' });

        // Rate limit: 1 OTP per 60 seconds
        if (user.otpExpires && user.otpExpires > new Date(Date.now() + 9 * 60 * 1000)) {
            return res.status(429).json({ message: 'Please wait before requesting a new OTP.' });
        }

        const otp = generateOTP();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        user.otpAttempts = 0;
        await user.save();

        // Send OTP via Email
        await sendOTPEmail(email, otp);

        res.json({
            message: 'New OTP sent!',
            ...(process.env.NODE_ENV !== 'production' && { devOTP: otp })
        });

    } catch (err) {
        console.error('Resend OTP Error:', err);
        res.status(500).json({ message: 'Failed to resend OTP.' });
    }
});

// ============================================================
// LOGIN
// ============================================================

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Check account lockout (brute-force prevention)
        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
            const minutesLeft = Math.ceil((user.lockoutUntil - new Date()) / 60000);
            return res.status(429).json({
                message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

            // Lock after 10 failed attempts
            if (user.failedLoginAttempts >= 10) {
                user.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lockout
                user.failedLoginAttempts = 0;
                await user.save();
                return res.status(429).json({
                    message: 'Account locked for 30 minutes due to too many failed login attempts.'
                });
            }

            await user.save();
            console.log(`[AUTH] Login failed for ${email}: Invalid password.`);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        console.log(`[AUTH] Login attempt for ${email} - Status: ${user.status}, Verified: ${user.isPhoneVerified}, Approved: ${user.isApproved}`);

        // Check account status
        if (user.status === 'suspended') {
            return res.status(403).json({ message: 'Your account has been suspended.' });
        }

        if (user.status === 'banned') {
            return res.status(403).json({ message: 'Your account has been banned.' });
        }

        // ═══════════════════════════════════════════════
        // ADMIN KEY VERIFICATION (Security Gate)
        // ═══════════════════════════════════════════════
        if (user.role === 'admin') {
            const { adminKey } = req.body;
            const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'PARUL2024ADMIN';

            // Check admin key lockout
            if (user.adminKeyLockoutUntil && user.adminKeyLockoutUntil > new Date()) {
                const minutesLeft = Math.ceil((user.adminKeyLockoutUntil - new Date()) / 60000);
                return res.status(429).json({
                    message: `Admin access locked for ${minutesLeft} minutes due to too many invalid attempts.`
                });
            }

            if (!adminKey) {
                // First attempt — tell frontend to ask for admin key
                return res.status(200).json({
                    requiresAdminKey: true,
                    message: 'Admin access requires a secret key. Please enter your Admin Key.',
                    email: user.email
                });
            }

            if (adminKey !== ADMIN_SECRET) {
                // Wrong admin key — log and increment failed attempts
                user.adminKeyFailedAttempts = (user.adminKeyFailedAttempts || 0) + 1;

                // Lock after 5 failed attempts
                if (user.adminKeyFailedAttempts >= 5) {
                    user.adminKeyLockoutUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour lockout
                    user.adminKeyFailedAttempts = 0;
                    await user.save();
                    return res.status(429).json({
                        message: 'Admin access locked for 1 hour due to too many invalid key attempts.'
                    });
                }

                await user.save();
                await logActivity(user._id, 'admin_key_failed', {
                    ipAddress: req.ip,
                    details: 'Invalid admin key attempt'
                });
                console.warn(`⚠️ SECURITY: Failed admin key attempt for ${user.email} from IP ${req.ip}`);
                return res.status(403).json({
                    message: `Invalid Admin Key. Attempt ${user.adminKeyFailedAttempts}/5.`
                });
            }

            // Correct admin key — reset attempts and log successful admin login
            user.adminKeyFailedAttempts = 0;
            user.adminKeyLockoutUntil = null;
            await user.save();

            await logActivity(user._id, 'admin_login', {
                ipAddress: req.ip,
                details: 'Admin key verified successfully'
            });
            console.log(`✅ ADMIN LOGIN: ${user.email} authenticated with admin key`);
        }

        // Check if phone is verified (for non-admin first-time users)
        if (!user.isPhoneVerified && user.role !== 'admin') {
            // Generate new OTP for unverified users
            const otp = generateOTP();
            user.otp = otp;
            user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
            await user.save();

            console.log(`📧 Login OTP for ${email}: ${otp}`);

            return res.status(200).json({
                requiresOTP: true,
                message: 'Please verify your OTP to continue.',
                userId: user._id,
                ...(process.env.NODE_ENV !== 'production' && { devOTP: otp })
            });
        }

        // Check approval
        if (!user.isApproved) {
            return res.status(403).json({ message: 'Your account is pending admin approval.' });
        }

        // Reset failed attempts on successful login
        user.failedLoginAttempts = 0;
        user.lockoutUntil = null;
        user.lastLoginAt = new Date();
        user.loginCount = (user.loginCount || 0) + 1;

        // Generate tokens
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);
        user.refreshToken = refreshToken;
        await user.save();

        await logActivity(user._id, 'login', { ipAddress: req.ip });

        const userObj = user.toObject();
        delete userObj.password;
        delete userObj.otp;
        delete userObj.otpExpires;
        delete userObj.refreshToken;

        res.json({
            message: 'Login successful!',
            token: accessToken,
            refreshToken,
            user: userObj
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: 'Login failed. Please try again.' });
    }
});

// ============================================================
// REFRESH TOKEN
// ============================================================

router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Invalid or expired refresh token.' });
        }

        if (decoded.type !== 'refresh') {
            return res.status(401).json({ message: 'Invalid token type.' });
        }

        const user = await User.findById(decoded.id);
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ message: 'Refresh token has been revoked.' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ message: 'Account is not active.' });
        }

        // Generate new tokens
        const newAccessToken = generateAccessToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);

        user.refreshToken = newRefreshToken;
        await user.save();

        await logActivity(user._id, 'token_refresh', { ipAddress: req.ip });

        res.json({
            token: newAccessToken,
            refreshToken: newRefreshToken
        });

    } catch (err) {
        console.error('Refresh Token Error:', err);
        res.status(500).json({ message: 'Token refresh failed.' });
    }
});

// ============================================================
// PASSWORD RESET (REQUEST)
// ============================================================

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Don't reveal if email exists — but still return success
            return res.json({ message: 'Reset code sent! Use code: 654321 for demo.', devOTP: '654321' });
        }

        const otp = generateOTP();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        user.otpAttempts = 0;
        await user.save();

        // Try to send OTP via Email (graceful failure)
        const emailSent = await sendOTPEmail(email, otp);

        // Always return success with OTP for demo
        res.json({
            message: emailSent
                ? 'Reset code sent to your email!'
                : `Reset code generated! Use code: ${otp}`,
            devOTP: otp
        });

    } catch (err) {
        console.error('Forgot Password Error:', err);
        res.status(500).json({ message: 'Failed to process request.' });
    }
});

// ============================================================
// PASSWORD RESET (CONFIRM)
// ============================================================

router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({ message: 'Account not found.' });
        }

        // Check OTP lockout
        const lockStatus = isOTPLocked(user);
        if (lockStatus.locked) {
            return res.status(429).json({
                message: `Too many attempts. Try again in ${lockStatus.minutesLeft} minutes.`
            });
        }

        // Verify OTP (Cast to string and trim to be safe)
        if (String(user.otp) !== String(otp).trim()) {
            user.otpAttempts = (user.otpAttempts || 0) + 1;
            console.log(`[AUTH] Invalid OTP attempt for ${email}. Expected: ${user.otp}, Got: ${otp}`);
            if (user.otpAttempts >= 5) {
                user.otpLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
                user.otpAttempts = 0;
            }
            await user.save();
            return res.status(400).json({ message: 'Invalid OTP.' });
        }

        // Check OTP expiry
        if (user.otpExpires && user.otpExpires < new Date()) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        // Update password (pre-save hook will hash it)
        user.password = newPassword;
        user.isPhoneVerified = true; // Mark as verified since they used OTP
        user.otp = null;
        user.otpExpires = null;
        user.otpAttempts = 0;
        user.otpLockedUntil = null;
        user.failedLoginAttempts = 0;
        user.lockoutUntil = null;
        await user.save();

        await logActivity(user._id, 'password_reset', { ipAddress: req.ip });

        res.json({ message: 'Password reset successfully! You can now login with your new password.' });

    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ message: 'Password reset failed.' });
    }
});

// ============================================================
// PROFILE ROUTES
// ============================================================

router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password -otp -otpExpires -refreshToken')
            .populate('campusId');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json(user);
    } catch (err) {
        console.error('Profile Error:', err);
        res.status(500).json({ message: 'Failed to fetch profile.' });
    }
});

const { uploadBase64 } = require('../utils/cloudinary');

router.put('/profile', authMiddleware, async (req, res) => {
    try {
        let { fullName, phone, photoURL, whatsappNumber, campusId } = req.body;
        const updates = {};

        if (photoURL && photoURL.startsWith('data:')) {
            try {
                photoURL = await uploadBase64(photoURL);
            } catch (e) {
                return res.status(500).json({ message: 'Photo upload failed.' });
            }
        }

        if (fullName) updates.fullName = fullName.trim();
        if (phone) updates.phone = phone.trim();
        if (photoURL) updates.photoURL = photoURL;
        if (whatsappNumber) updates.whatsappNumber = whatsappNumber.trim();
        if (campusId) updates.campusId = campusId;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        )
            .select('-password -otp -otpExpires -refreshToken')
            .populate('campusId');

        res.json({
            message: 'Profile updated!',
            user,
            debug: { fieldsUpdated: Object.keys(updates) }
        });

    } catch (err) {
        console.error('Profile Update Error:', err);
        res.status(500).json({ message: 'Failed to update profile.' });
    }
});

// ============================================================
// CHANGE PASSWORD (Logged-in users)
// ============================================================

router.put('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters.' });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ message: 'New password must be different from current password.' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect.' });
        }

        user.password = newPassword; // Pre-save hook will hash it
        await user.save();

        await logActivity(user._id, 'password_changed', { ipAddress: req.ip });

        res.json({ message: 'Password changed successfully!' });
    } catch (err) {
        console.error('Change Password Error:', err);
        res.status(500).json({ message: 'Failed to change password.' });
    }
});

// ============================================================
// PUSH TOKEN
// ============================================================

router.post('/push-token', authMiddleware, async (req, res) => {
    try {
        const { pushToken } = req.body;
        if (!pushToken) {
            return res.status(400).json({ message: 'Push token is required.' });
        }

        await User.findByIdAndUpdate(req.user._id, { pushToken });
        res.json({ message: 'Push token saved.' });

    } catch (err) {
        console.error('Push Token Error:', err);
        res.status(500).json({ message: 'Failed to save push token.' });
    }
});

// ============================================================
// CAMPUS SELECTION
// ============================================================

router.get('/campuses', async (req, res) => {
    try {
        const campuses = await Campus.find({ isActive: true })
            .select('name location allowedEmailDomains settings');
        res.json(campuses);
    } catch (err) {
        console.error('Campus List Error:', err);
        res.status(500).json({ message: 'Failed to fetch campuses.' });
    }
});

router.put('/select-campus', authMiddleware, async (req, res) => {
    try {
        const { campusId } = req.body;
        if (!campusId) {
            return res.status(400).json({ message: 'Campus ID is required.' });
        }

        const campus = await Campus.findById(campusId);
        if (!campus) {
            return res.status(404).json({ message: 'Campus not found.' });
        }

        await User.findByIdAndUpdate(req.user._id, { campusId });

        res.json({ message: 'Campus selected successfully!', campus });

    } catch (err) {
        console.error('Campus Select Error:', err);
        res.status(500).json({ message: 'Failed to select campus.' });
    }
});

// ============================================================
// LEADERBOARD
// ============================================================

router.get('/leaderboard', authMiddleware, async (req, res) => {
    try {
        const campusId = req.user.campusId?._id || req.user.campusId;

        const query = campusId ? { campusId, status: 'active' } : { status: 'active' };

        const leaders = await User.find(query)
            .sort({ karmaPoints: -1 })
            .limit(50)
            .select('fullName photoURL karmaPoints role nftBadges');

        const leaderboard = leaders.map((user, index) => ({
            rank: index + 1,
            _id: user._id,
            fullName: user.fullName,
            photoURL: user.photoURL,
            karmaPoints: user.karmaPoints,
            role: user.role,
            badgeCount: user.nftBadges?.length || 0
        }));

        res.json(leaderboard);

    } catch (err) {
        console.error('Leaderboard Error:', err);
        res.status(500).json({ message: 'Failed to fetch leaderboard.' });
    }
});

// ============================================================
// LOGOUT
// ============================================================

router.post('/logout', authMiddleware, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            refreshToken: null,
            pushToken: null
        });

        await logActivity(req.user._id, 'logout', { ipAddress: req.ip });

        res.json({ message: 'Logged out successfully.' });
    } catch (err) {
        console.error('Logout Error:', err);
        res.status(500).json({ message: 'Logout failed.' });
    }
});

module.exports = router;
