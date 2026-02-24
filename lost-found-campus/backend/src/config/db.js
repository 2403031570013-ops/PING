const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const User = require('../models/User');
const Campus = require('../models/Campus');

/**
 * Database Connection Manager
 * - Uses MONGO_URI from .env if available (production/staging)
 * - Falls back to LOCAL PERSISTENT MongoDB for development/testing
 * - Data is stored on disk in .mongo-data/ so it survives restarts
 * - Seeds default test accounts in dev mode
 */
let memoryServer = null;

const connectDB = async () => {
    // If already connected, skip
    if (mongoose.connection.readyState === 1) return;

    const mongoURI = process.env.MONGO_URI;
    const isProduction = process.env.NODE_ENV === 'production';

    try {
        let uri;

        if (mongoURI && mongoURI.startsWith('mongodb')) {
            // Production/Staging: Use real MongoDB Atlas
            console.log("🟢 Connecting to MongoDB Atlas...");
            uri = mongoURI;
        } else {
            // Development: Use local MongoDB with PERSISTENT storage on disk
            console.log("🟠 Starting Local Persistent Database...");
            const { MongoMemoryServer } = require('mongodb-memory-server');

            // Create persistent data directory
            const dbPath = path.join(__dirname, '..', '..', '.mongo-data');
            if (!fs.existsSync(dbPath)) {
                fs.mkdirSync(dbPath, { recursive: true });
            }

            if (!memoryServer) {
                memoryServer = await MongoMemoryServer.create({
                    instance: {
                        dbPath: dbPath,       // Store data files on disk
                        storageEngine: 'wiredTiger',  // Persistent storage engine
                    }
                });
            }
            uri = memoryServer.getUri();
            console.log(`✅ Local DB Started (persistent at ${dbPath})`);
        }

        await mongoose.connect(uri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        console.log("✅ MongoDB Connected & Models Synced.");

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error("❌ MongoDB Connection Error:", err.message);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn("⚠️ MongoDB Disconnected. Attempting reconnect...");
        });

        // Seed test data in development mode
        if (!isProduction) {
            await seedDevData();
        }

    } catch (err) {
        console.error("❌ Database Connection Failed:", err.message);
        if (!isProduction) {
            console.log("💡 Tip: Check MONGO_URI in .env or ensure mongodb-memory-server is installed.");
        }
        process.exit(1);
    }
};

/**
 * Seeds default accounts for development/testing
 * Uses pre-hashed passwords via insertMany to avoid double-hashing by pre-save hook.
 */
const seedDevData = async () => {
    try {
        // Seed Campus
        const campus = await Campus.findOneAndUpdate(
            { name: 'Parul University' },
            {
                location: 'Vadodara, Gujarat',
                isActive: true,
                adminContact: {
                    name: 'Admin Office',
                    email: 'admin@paruluniversity.ac.in',
                    phone: '+91-265-2882672'
                },
                allowedEmailDomains: ['paruluniversity.ac.in'],
                settings: {
                    requireStaffApproval: false,
                    autoMatchEnabled: true,
                    maxItemAge: 30,
                    nftBadgesEnabled: true,
                    whatsappEnabled: false
                },
                landmarks: [
                    { name: 'PIT Engineering', coordinates: { latitude: 22.3572, longitude: 73.2085 }, type: 'academic' },
                    { name: 'Central Library', coordinates: { latitude: 22.3580, longitude: 73.2090 }, type: 'academic' },
                    { name: 'Putulik Food Court', coordinates: { latitude: 22.3568, longitude: 73.2075 }, type: 'food' },
                    { name: 'Teresa Hostel', coordinates: { latitude: 22.3565, longitude: 73.2095 }, type: 'hostel' },
                    { name: 'Cricket Ground', coordinates: { latitude: 22.3560, longitude: 73.2070 }, type: 'sports' },
                    { name: 'Parul Sevashram Hospital', coordinates: { latitude: 22.3575, longitude: 73.2100 }, type: 'hospital' },
                    { name: 'Admin Block', coordinates: { latitude: 22.3578, longitude: 73.2082 }, type: 'admin' },
                    { name: 'Security Main Gate', coordinates: { latitude: 22.3555, longitude: 73.2060 }, type: 'other' }
                ]
            },
            { upsert: true, new: true }
        );

        // Check if test accounts already exist
        const existingAdmin = await User.findOne({ email: 'admin@example.com' });
        if (existingAdmin) {
            console.log("✅ Seed data already exists. Skipping...");
            return;
        }

        // Hash password manually (insertMany bypasses pre-save hooks)
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('password123', 12);

        await User.insertMany([
            {
                fullName: 'Test Student',
                email: 'student@example.com',
                password: hashedPassword,
                role: 'student',
                campusId: campus._id,
                isApproved: true,
                isPhoneVerified: true,
                status: 'active',
                phone: '9876543210',
                karmaPoints: 25
            },
            {
                fullName: 'Campus Admin',
                email: 'admin@example.com',
                password: hashedPassword,
                role: 'admin',
                campusId: campus._id,
                isApproved: true,
                isPhoneVerified: true,
                status: 'active',
                phone: '9876543211',
                karmaPoints: 100
            },
            {
                fullName: 'Security Staff',
                email: 'staff@example.com',
                password: hashedPassword,
                role: 'staff',
                campusId: campus._id,
                isApproved: true,
                isPhoneVerified: true,
                status: 'active',
                phone: '9876543212',
                karmaPoints: 50
            }
        ]);

        console.log("✅ Dev Seed Data Created:");
        console.log("   📧 student@example.com / password123");
        console.log("   📧 admin@example.com   / password123");
        console.log("   📧 staff@example.com   / password123");
    } catch (err) {
        if (err.code === 11000) {
            console.log("✅ Seed data already exists.");
        } else {
            console.error("⚠️ Seed Error:", err.message);
        }
    }
};

module.exports = connectDB;
