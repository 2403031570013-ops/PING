/**
 * Input Sanitization Middleware
 * Prevents NoSQL injection, XSS, and other input-based attacks.
 */

/**
 * Recursively sanitize object values
 */
const sanitizeValue = (value) => {
    if (typeof value === 'string') {
        // Remove MongoDB operators
        return value
            .replace(/\$/g, '')
            .replace(/\{/g, '')
            .replace(/\}/g, '')
            // Basic XSS prevention
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
            .replace(/on\w+\s*=\s*'[^']*'/gi, '')
            .trim();
    }
    if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
            return value.map(sanitizeValue);
        }
        const sanitized = {};
        for (const key of Object.keys(value)) {
            // Block MongoDB operator keys
            if (key.startsWith('$')) continue;
            sanitized[key] = sanitizeValue(value[key]);
        }
        return sanitized;
    }
    return value;
};

/**
 * Sanitize all incoming request data
 */
const sanitizeInput = (req, res, next) => {
    try {
        if (req.body && typeof req.body === 'object') {
            // Don't sanitize base64 image data (photoURL, image fields)
            const preserveFields = ['photoURL', 'image', 'base64'];
            const preserved = {};

            for (const field of preserveFields) {
                if (req.body[field]) {
                    preserved[field] = req.body[field];
                }
            }

            req.body = sanitizeValue(req.body);

            // Restore preserved fields
            for (const [key, val] of Object.entries(preserved)) {
                req.body[key] = val;
            }
        }

        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeValue(req.query);
        }

        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeValue(req.params);
        }

        next();
    } catch (err) {
        console.error('Sanitization Error:', err);
        next(); // Don't block request on sanitization failure
    }
};

/**
 * Validate MongoDB ObjectId format
 */
const validateObjectId = (paramName) => {
    return (req, res, next) => {
        const id = req.params[paramName];
        if (id && !/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({ message: `Invalid ${paramName} format.` });
        }
        next();
    };
};

module.exports = { sanitizeInput, validateObjectId };
