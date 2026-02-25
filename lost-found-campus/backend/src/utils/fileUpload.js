const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Saves a base64 string as a local file in the /uploads directory.
 * Returns the relative path to the file.
 */
const saveBase64Locally = async (base64Str) => {
    try {
        // Ensure uploads directory exists
        const uploadDir = path.join(__dirname, '..', '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Extract mime type and base64 data
        const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 string');
        }

        const type = matches[1];
        const data = Buffer.from(matches[2], 'base64');

        // Determine extension
        let extension = 'jpg';
        if (type.includes('png')) extension = 'png';
        if (type.includes('gif')) extension = 'gif';
        if (type.includes('webp')) extension = 'webp';

        const fileName = `${uuidv4()}.${extension}`;
        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, data);

        return `/uploads/${fileName}`;
    } catch (error) {
        console.error('Error saving base64 locally:', error);
        throw error;
    }
};

module.exports = { saveBase64Locally };
