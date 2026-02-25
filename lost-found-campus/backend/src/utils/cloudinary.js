const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'lost-found-campus',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const uploadBase64 = async (base64Str) => {
    try {
        const result = await cloudinary.uploader.upload(base64Str, {
            folder: 'lost-found-campus',
            transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
        });
        return result.secure_url;
    } catch (err) {
        console.error('Cloudinary Upload Error:', err);
        throw new Error('Failed to upload image to cloud.');
    }
};

module.exports = { cloudinary, upload, uploadBase64 };
