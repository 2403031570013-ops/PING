const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./src/models/User');
const LostItem = require('./src/models/LostItem');
const FoundItem = require('./src/models/FoundItem');
const Campus = require('./src/models/Campus');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Use MongoDB Connection Successful");

        // Clear existing data
        await User.deleteMany({});
        await LostItem.deleteMany({});
        await FoundItem.deleteMany({});
        // We won't clear Campuses to keep the list stable, assuming they exist from previous step or allow duplicates if rerun. 
        // Actually, let's just find the first campus to link users.
        const campus = await mongoose.connection.db.collection('campuses').findOne();
        const campusId = campus ? campus._id : new mongoose.Types.ObjectId();

        console.log("🧹 Cleared old data");

        // Create Users
        const passwordHash = await bcrypt.hash('123456', 10);

        const users = [
            {
                fullName: "Anik Jain",
                email: "anik@test.com",
                password: passwordHash,
                phone: "9876543210",
                role: "student",
                campusId: campusId,
                photoURL: "https://randomuser.me/api/portraits/men/32.jpg"
            },
            {
                fullName: "Rahul Sharma",
                email: "rahul@test.com",
                password: passwordHash,
                phone: "8765432109",
                role: "student",
                campusId: campusId,
                photoURL: "https://randomuser.me/api/portraits/men/45.jpg"
            },
            {
                fullName: "Sneha Gupta",
                email: "sneha@test.com",
                password: passwordHash,
                phone: "7654321098",
                role: "student",
                campusId: campusId,
                photoURL: "https://randomuser.me/api/portraits/women/44.jpg"
            }
        ];

        const createdUsers = await User.insertMany(users);
        console.log(`👤 Created ${createdUsers.length} Users`);

        // Create Lost Items (Things Anik & Sneha lost)
        const lostItems = [
            {
                title: "Blue Denim Jacket",
                description: "Lost my Levi's denim jacket near the library canteen. It has a distinctive patch on the left arm.",
                location: "Library Canteen",
                campusId: campusId,
                postedBy: createdUsers[0]._id, // Anik
                image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&q=80",
                isFeatured: true,
                createdAt: new Date(Date.now() - 86400000) // 1 day ago
            },
            {
                title: "Calculus Textbook",
                description: "Left my Thomas' Calculus book on a bench in the main park. Please help!",
                location: "Main Park",
                campusId: campusId,
                postedBy: createdUsers[2]._id, // Sneha
                image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&q=80",
                createdAt: new Date(Date.now() - 172800000) // 2 days ago
            },
            {
                title: "Airpods Pro Case",
                description: "White Apple Airpods Pro case lost somewhere near the academic block.",
                location: "Academic Block",
                campusId: campusId,
                postedBy: createdUsers[0]._id, // Anik
                image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=500&q=80",
                createdAt: new Date(Date.now() - 3600000 * 5) // 5 hours ago
            }
        ];

        await LostItem.insertMany(lostItems);
        console.log(`🔍 Created ${lostItems.length} Lost Items`);

        // Create Found Items (Things Rahul & Sneha found)
        const foundItems = [
            {
                title: "Black Wallet",
                description: "Found a black leather wallet near the bus stop. Contains some cash and an ID card.",
                location: "Bus Stop",
                campusId: campusId,
                postedBy: createdUsers[1]._id, // Rahul
                image: "https://images.unsplash.com/photo-1627123424574-181ce5171c98?w=500&q=80",
                createdAt: new Date(Date.now() - 43200000) // 12 hours ago
            },
            {
                title: "Silver Wristwatch",
                description: "Found a silver analog watch in the computer lab. It's stored with security.",
                location: "Computer Lab 3",
                campusId: campusId,
                postedBy: createdUsers[2]._id, // Sneha
                image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=80",
                createdAt: new Date(Date.now() - 90000000) // 1 day ago
            },
            {
                title: "Set of Keys",
                description: "Found a keychain with 3 keys and a Honda logo.",
                location: "Parking Lot",
                campusId: campusId,
                postedBy: createdUsers[1]._id, // Rahul
                image: "https://images.unsplash.com/photo-1582140134460-e179e604014f?w=500&q=80",
                createdAt: new Date(Date.now() - 3600000) // 1 hour ago
            }
        ];

        await FoundItem.insertMany(foundItems);
        console.log(`✅ Created ${foundItems.length} Found Items`);

        console.log("\n🎉 Database Seeded Successfully!");
        console.log("-------------------------------------------------");
        console.log("LOGIN CREDENTIALS:");
        console.log("1. Anik (Main User): anik@test.com / 123456");
        console.log("2. Rahul (Other User): rahul@test.com / 123456");
        console.log("3. Sneha (Other User): sneha@test.com / 123456");
        console.log("-------------------------------------------------");

        process.exit(0);
    } catch (error) {
        console.error("Error seeding data:", error);
        process.exit(1);
    }
};

seedData();
