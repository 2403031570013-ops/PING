const mongoose = require('mongoose');
const dns = require('dns');
const dotenv = require('dotenv');

dns.setServers(['8.8.8.8', '8.8.4.4']);
const Campus = require('./src/models/Campus');
const User = require('./src/models/User');
const LostItem = require('./src/models/LostItem');
const Claim = require('./src/models/Claim');

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            tlsAllowInvalidCertificates: true
        });
        console.log("Connected to MongoDB for seeding...");

        // Clear existing data for fresh seed
        await Campus.deleteMany({});
        await LostItem.deleteMany({});
        await Claim.deleteMany({});

        // 1. Create Campuses
        const campuses = [
            { name: 'Parul University', location: 'Vadodara, Gujarat', adminContact: 'admin@paruluniversity.ac.in', isActive: true },
            { name: 'VIT Vellore', location: 'Vellore, Tamil Nadu', adminContact: 'admin@vit.ac.in', isActive: true },
            { name: 'IIT Delhi', location: 'Hauz Khas, Delhi', adminContact: 'admin@iitd.ac.in', isActive: true },
            { name: 'BITS Pilani', location: 'Pilani, Rajasthan', adminContact: 'admin@bits.ac.in', isActive: true },
            { name: 'SRM University', location: 'Chennai, TN', adminContact: 'admin@srm.ac.in', isActive: true }
        ];

        const createdCampuses = await Campus.insertMany(campuses);
        console.log(`Seeded ${createdCampuses.length} campuses.`);

        const hashedPassword = await User.hashPassword('password123');

        // 2. Create Users
        const adminUser = await User.findOneAndUpdate(
            { email: 'admin@example.com' },
            {
                fullName: 'Campus Admin',
                password: hashedPassword,
                campusId: createdCampuses[0]._id,
                phone: '+919999999999',
                role: 'admin'
            },
            { upsert: true, new: true }
        );

        const dummyStudent = await User.findOneAndUpdate(
            { email: 'student@example.com' },
            {
                fullName: 'Jane Doe',
                password: hashedPassword,
                campusId: createdCampuses[0]._id,
                phone: '+918888888888',
                role: 'student'
            },
            { upsert: true, new: true }
        );
        console.log("Seeded default users.");

        // 3. Create Sample Items
        const lostItem = await LostItem.create({
            title: 'Black Backpack',
            description: 'Contains a laptop and cables. Left at library.',
            image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62',
            location: 'Central Library',
            campusId: createdCampuses[0]._id.toString(),
            postedBy: adminUser._id.toString()
        });
        console.log("Seeded sample items.");

        // 4. Create Sample Claim
        await Claim.create({
            itemId: lostItem._id.toString(),
            itemType: 'lost',
            claimantId: dummyStudent._id,
            ownerId: adminUser._id,
            message: "I left my bag at the library yesterday morning. This looks like mine!",
            status: 'pending'
        });
        console.log("Seeded sample claim request.");

        console.log("🚀 Seed complete! Demo accounts: admin@example.com / student@example.com");
    } catch (error) {
        console.error("❌ Seeding failed:", error);
    } finally {
        mongoose.connection.close();
    }
};

seedData();
