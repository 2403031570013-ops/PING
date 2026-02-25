/**
 * Deployment Readiness Check Script
 * Run this script to verify if the backend is ready for production.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log("\n🔍 [READINESS CHECK] Starting production audit...\n");

const checkEnv = () => {
    const required = [
        'JWT_SECRET',
        'ADMIN_SECRET_KEY',
    ];
    const optional = [
        'MONGO_URI',
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET',
        'EMAIL_USER',
        'EMAIL_PASS'
    ];

    let missingRequired = false;
    required.forEach(key => {
        if (!process.env[key]) {
            console.error(`❌ Missing Required: ${key}`);
            missingRequired = true;
        } else {
            console.log(`✅ ${key} is set.`);
        }
    });

    optional.forEach(key => {
        if (!process.env[key]) {
            console.warn(`⚠️  Missing Recommended for Production: ${key}`);
        } else {
            console.log(`✅ ${key} is set.`);
        }
    });

    if (missingRequired) {
        console.error("\nCRITICAL: One or more required environment variables are missing!");
        return false;
    }
    return true;
};

const checkUploadsDir = () => {
    const uploadsPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsPath)) {
        console.log("📁 Creating 'uploads' directory...");
        fs.mkdirSync(uploadsPath);
    }
    console.log("✅ 'uploads' directory exists.");
};

const checkDbDir = () => {
    const dbPath = path.join(__dirname, '.mongo-data');
    if (!fs.existsSync(dbPath)) {
        console.log("📁 Creating '.mongo-data' directory for local persistence...");
        fs.mkdirSync(dbPath);
    }
    console.log("✅ '.mongo-data' directory exists.");
};

const main = async () => {
    const envOk = checkEnv();
    checkUploadsDir();
    checkDbDir();

    if (envOk) {
        console.log("\n🚀 SYSTEM COMPATIBILITY: OK");
        console.log("💡 Reminder: Ensure MONGO_URI is set for cloud-hosted deployments (Render/NodeHost).");
        console.log("💡 Reminder: Ensure EMAIL_USER/PASS and CLOUDINARY_* are set for full feature support.\n");
    } else {
        console.log("\n🛑 SYSTEM COMPATIBILITY: FAILED\n");
        process.exit(1);
    }
};

main();
