const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send Push Notification to a specific user
 * @param {string} pushToken - The recipient's Expo push token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload
 */
const sendPushNotification = async (pushToken, title, body, data = {}) => {
    // Check that all your push tokens appear to be valid Expo push tokens
    if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`❌ Push token ${pushToken} is not a valid Expo push token`);
        return;
    }

    const message = {
        to: pushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
        priority: 'high',
        channelId: 'default',
    };

    try {
        const ticketChunk = await expo.sendPushNotificationsAsync([message]);
        console.log('✅ Push notification sent successfully');
        // NOTE: In production, you would process the receipts to handle stale tokens
        return ticketChunk;
    } catch (error) {
        console.error('❌ Error sending push notification:', error);
    }
};

/**
 * Send Multi-User Push Notifications
 * Useful for match notifications
 */
const sendMultiplePushNotifications = async (notifications) => {
    const messages = [];
    for (const notification of notifications) {
        const { pushToken, title, body, data } = notification;

        if (!Expo.isExpoPushToken(pushToken)) {
            console.warn(`⚠️ Skipping invalid push token: ${pushToken}`);
            continue;
        }

        messages.push({
            to: pushToken,
            sound: 'default',
            title,
            body,
            data: data || {},
        });
    }

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            console.error('❌ Error sending push notification chunk:', error);
        }
    }

    return tickets;
};

module.exports = {
    sendPushNotification,
    sendMultiplePushNotifications
};
