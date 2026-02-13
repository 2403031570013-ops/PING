import io from 'socket.io-client';

const SOCKET_URL = 'http://127.0.0.1:5000';

let socket;

export const initiateSocket = (userId) => {
    // If socket already exists and is connected, just join.
    if (socket && socket.connected) {
        socket.emit('join', userId);
        return socket;
    }

    // Otherwise create new
    if (!socket) socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket'], // Prefer WebSockets to avoid XHR polling noise
    });

    if (socket && userId) {
        // Emit join on initial connection AND every reconnection
        socket.on('connect', () => {
            console.log(`✅ Socket Connected: ${socket.id}, Joining as ${userId}`);
            socket.emit('join', userId);
        });

        // Handle errors
        socket.on('connect_error', (err) => {
            console.error("❌ Socket Connection Error:", err.message);
        });
    }
    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
