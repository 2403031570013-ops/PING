const nodemailer = require('nodemailer');

// Configure Email Transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Send OTP Email
 */
const sendOTPEmail = async (email, otp) => {
    // If no credentials are set, log to console (fallback for dev)
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️ [EMAIL SERVICE] No SMTP credentials. Logging OTP to console:');
        console.log(`🔑 OTP for ${email}: ${otp}`);
        return true;
    }

    try {
        const mailOptions = {
            from: `"Lost & Found Campus" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Verification Code - Lost & Found Campus',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
                    <h2 style="color: #4F46E5;">Lost & Found Campus</h2>
                    <p>Hello,</p>
                    <p>Your verification code for signing up or resetting your password is:</p>
                    <div style="background: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; margin: 25px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${otp}</span>
                    </div>
                    <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #6b7280;">Helping you find what's yours. Parul University Governance Team.</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ [EMAIL SERVICE] OTP sent to ${email}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ [EMAIL SERVICE] Failed to send email:', error.message);
        return false;
    }
};

/**
 * Send Match Notification Email
 */
const sendMatchEmail = async (email, itemType, itemTitle, matchPercentage) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return false;

    try {
        const mailOptions = {
            from: `"Lost & Found Campus" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `🎯 New Match Found (${matchPercentage}%) - Lost & Found`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
                    <h2 style="color: #4F46E5;">🎯 Potential Match Detected!</h2>
                    <p>Great news! Our AI matching engine has found a possible match for your report.</p>
                    <p><strong>Item:</strong> ${itemTitle}</p>
                    <p><strong>Type:</strong> ${itemType === 'lost' ? 'Found Item' : 'Lost Item'}</p>
                    <p><strong>Confidence:</strong> ${matchPercentage}%</p>
                    <p style="margin-top: 20px;">Open the app now to view the details and start a claim if it looks correct.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="#" style="background: #4F46E5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Match in App</a>
                    </div>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #6b7280;">This is an automated notification from the Lost & Found Campus system.</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ [EMAIL SERVICE] Match email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ [EMAIL SERVICE] Failed to send match email:', error.message);
        return false;
    }
};

module.exports = {
    sendOTPEmail,
    sendMatchEmail
};
