const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Campus = require('./models/Campus');
const LostItem = require('./models/LostItem');
const FoundItem = require('./models/FoundItem');
const Claim = require('./models/Claim');
const Notification = require('./models/Notification');

const connectDB = require('./config/db');

const seedData = async () => {
    try {
        await connectDB();
        console.log('🗑️  Clearing existing data...');

        await User.deleteMany({});
        await Campus.deleteMany({});
        await LostItem.deleteMany({});
        await FoundItem.deleteMany({});
        await Claim.deleteMany({});
        await Notification.deleteMany({});

        console.log('🏫 Creating Campus...');
        const campus = await Campus.create({
            name: 'Delhi University',
            city: 'New Delhi',
            state: 'Delhi',
            country: 'India'
        });

        console.log('👥 Creating Users...');
        const hashedPassword = await User.hashPassword('demo123');

        const users = await User.insertMany([
            {
                fullName: 'Rahul Sharma',
                email: 'rahul@demo.com',
                password: hashedPassword,
                phone: '+91 9876543210',
                photoURL: 'https://randomuser.me/api/portraits/men/1.jpg',
                campusId: campus._id,
                role: 'student',
                karmaPoints: 250
            },
            {
                fullName: 'Priya Singh',
                email: 'priya@demo.com',
                password: hashedPassword,
                phone: '+91 9876543211',
                photoURL: 'https://randomuser.me/api/portraits/women/2.jpg',
                campusId: campus._id,
                role: 'student',
                karmaPoints: 180
            },
            {
                fullName: 'Amit Kumar',
                email: 'amit@demo.com',
                password: hashedPassword,
                phone: '+91 9876543212',
                photoURL: 'https://randomuser.me/api/portraits/men/3.jpg',
                campusId: campus._id,
                role: 'student',
                karmaPoints: 320
            },
            {
                fullName: 'Sneha Patel',
                email: 'sneha@demo.com',
                password: hashedPassword,
                phone: '+91 9876543213',
                photoURL: 'https://randomuser.me/api/portraits/women/4.jpg',
                campusId: campus._id,
                role: 'student',
                karmaPoints: 150
            },
            {
                fullName: 'Admin User',
                email: 'admin@demo.com',
                password: hashedPassword,
                phone: '+91 9876543200',
                photoURL: 'https://randomuser.me/api/portraits/men/10.jpg',
                campusId: campus._id,
                role: 'admin',
                karmaPoints: 500
            },
            {
                fullName: 'Vikram Reddy',
                email: 'vikram@demo.com',
                password: hashedPassword,
                phone: '+91 9876543214',
                photoURL: 'https://randomuser.me/api/portraits/men/5.jpg',
                campusId: campus._id,
                role: 'student',
                karmaPoints: 420
            },
            {
                fullName: 'Ananya Gupta',
                email: 'ananya@demo.com',
                password: hashedPassword,
                phone: '+91 9876543215',
                photoURL: 'https://randomuser.me/api/portraits/women/6.jpg',
                campusId: campus._id,
                role: 'student',
                karmaPoints: 280
            },
            {
                fullName: 'Rohan Mehta',
                email: 'rohan@demo.com',
                password: hashedPassword,
                phone: '+91 9876543216',
                photoURL: 'https://randomuser.me/api/portraits/men/7.jpg',
                campusId: campus._id,
                role: 'student',
                karmaPoints: 95
            }
        ]);

        console.log('📦 Creating Lost Items...');
        const lostItems = await LostItem.insertMany([
            {
                title: 'MacBook Pro 14"',
                description: 'Silver MacBook Pro with stickers. Last seen in library 2nd floor. Very important for my project work!',
                image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
                location: 'Central Library, 2nd Floor',
                category: 'Electronics',
                campusId: campus._id,
                postedBy: users[0]._id,
                status: 'active'
            },
            {
                title: 'Student ID Card',
                description: 'Blue Delhi University ID card. Name: Rahul Sharma. Roll No: 2024/CS/101',
                image: 'https://images.unsplash.com/photo-1578670812003-60745e2c2ea9?w=400',
                location: 'Canteen Area',
                category: 'Documents',
                campusId: campus._id,
                postedBy: users[1]._id,
                status: 'active'
            },
            {
                title: 'AirPods Pro',
                description: 'White AirPods Pro in original case. Has my initials "RS" engraved.',
                image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400',
                location: 'Sports Ground',
                category: 'Electronics',
                campusId: campus._id,
                postedBy: users[2]._id,
                status: 'active'
            },
            {
                title: 'Black Leather Wallet',
                description: 'Fossil brand wallet with cards and some cash. Very important documents inside!',
                image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400',
                location: 'Parking Lot B',
                category: 'Accessories',
                campusId: campus._id,
                postedBy: users[3]._id,
                status: 'active'
            },
            {
                title: 'Blue Denim Jacket',
                description: 'Levis denim jacket, size M. Left in auditorium during fest.',
                image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400',
                location: 'Main Auditorium',
                category: 'Clothing',
                campusId: campus._id,
                postedBy: users[5]._id,
                status: 'active'
            },
            {
                title: 'Car Keys - Honda',
                description: 'Honda car keys with red keychain. Has a small photo frame attached.',
                image: 'https://images.unsplash.com/photo-1553531384-cc64ac80f931?w=400',
                location: 'Admin Block',
                category: 'Keys',
                campusId: campus._id,
                postedBy: users[6]._id,
                status: 'active'
            }
        ]);

        console.log('✅ Creating Found Items...');
        const foundItems = await FoundItem.insertMany([
            {
                title: 'iPhone 15 Pro',
                description: 'Found near the fountain. Blue color with clear case. Screen locked.',
                image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400',
                location: 'Campus Fountain',
                category: 'Electronics',
                campusId: campus._id,
                postedBy: users[2]._id,
                status: 'active'
            },
            {
                title: 'Prescription Glasses',
                description: 'Black frame reading glasses found on bench. Looks expensive.',
                image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400',
                location: 'Garden Area',
                category: 'Accessories',
                campusId: campus._id,
                postedBy: users[3]._id,
                status: 'active'
            },
            {
                title: 'Blue Backpack',
                description: 'Wildcraft blue backpack with books and notebooks inside. Found near bus stop.',
                image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
                location: 'Bus Stop',
                category: 'Bags',
                campusId: campus._id,
                postedBy: users[0]._id,
                status: 'active'
            },
            {
                title: 'Scientific Calculator',
                description: 'Casio FX-991EX calculator. Found in Exam Hall after math exam.',
                image: 'https://images.unsplash.com/photo-1564466809058-bf4114d55352?w=400',
                location: 'Exam Hall 3',
                category: 'Electronics',
                campusId: campus._id,
                postedBy: users[5]._id,
                status: 'active'
            },
            {
                title: 'Gold Chain',
                description: 'Thin gold chain found near temple. Looks like traditional design.',
                image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400',
                location: 'Temple Area',
                category: 'Accessories',
                campusId: campus._id,
                postedBy: users[6]._id,
                status: 'active'
            }
        ]);

        console.log('🤝 Creating Claims...');
        await Claim.insertMany([
            {
                itemId: lostItems[0]._id,
                itemType: 'lost',
                claimantId: users[2]._id,
                ownerId: users[0]._id,
                message: 'I found your MacBook in the library! It was under a desk.',
                status: 'pending'
            },
            {
                itemId: foundItems[0]._id,
                itemType: 'found',
                claimantId: users[1]._id,
                ownerId: users[2]._id,
                message: 'This is my iPhone! I lost it yesterday near the fountain.',
                status: 'pending'
            },
            {
                itemId: lostItems[3]._id,
                itemType: 'lost',
                claimantId: users[5]._id,
                ownerId: users[3]._id,
                message: 'I found a wallet matching this description in the parking.',
                status: 'approved'
            }
        ]);

        console.log('🔔 Creating Notifications...');
        await Notification.insertMany([
            {
                userId: users[0]._id,
                title: 'New Claim Request',
                message: 'Amit Kumar has found your MacBook Pro!',
                type: 'claim',
                read: false
            },
            {
                userId: users[0]._id,
                title: 'Welcome to Lost & Found!',
                message: 'Start by posting lost items or helping others find theirs.',
                type: 'system',
                read: true
            },
            {
                userId: users[1]._id,
                title: 'Claim Update',
                message: 'Your claim for iPhone 15 Pro is pending review.',
                type: 'info',
                read: false
            },
            {
                userId: users[2]._id,
                title: 'You earned 50 Karma!',
                message: 'Thanks for helping return an item to its owner!',
                type: 'resolved',
                read: false
            },
            {
                userId: users[3]._id,
                title: 'Item Resolved',
                message: 'Your wallet has been found and returned!',
                type: 'resolved',
                read: true
            }
        ]);

        console.log('\n✨ ============= SEED COMPLETE ============= ✨');
        console.log('\n📋 DEMO CREDENTIALS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('| Email              | Password  | Role   |');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('| rahul@demo.com     | demo123   | User   |');
        console.log('| priya@demo.com     | demo123   | User   |');
        console.log('| amit@demo.com      | demo123   | User   |');
        console.log('| admin@demo.com     | demo123   | Admin  |');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📊 DATA CREATED:');
        console.log(`   🏫 1 Campus: Delhi University`);
        console.log(`   👥 ${users.length} Users (with various karma points)`);
        console.log(`   📦 ${lostItems.length} Lost Items (various categories)`);
        console.log(`   ✅ ${foundItems.length} Found Items (various categories)`);
        console.log(`   🤝 3 Claims (pending & approved)`);
        console.log(`   🔔 5 Notifications`);
        console.log('\n🎯 TEST FEATURES:');
        console.log('   • Leaderboard: Check Profile > Campus Heroes');
        console.log('   • Categories: Filter items on Home Screen');
        console.log('   • Notifications: Bell icon on Home / Profile');
        console.log('   • Dark Mode: Toggle in Profile > Dark Mode');
        console.log('   • Report: Click "Report this item" on any item');
        console.log('   • Share: Share button on item detail page');
        console.log('   • Quick Contact: Call/Email icons on item detail');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed Error:', error);
        process.exit(1);
    }
};

seedData();
