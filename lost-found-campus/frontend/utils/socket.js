import io from 'socket.io-client';
import { Platform } from 'react-native';

const getBaseUrl = () => {
    // Production RENDER URL (Supports WebSockets)
    return 'https://lostfound-backend-obc3.onrender.com';
};

const SOCKET_URL = getBaseUrl();

let socket;

export const initiateSocket = (userId) => {
    if (Platform.OS === 'web') {
        const stub = {
            on: () => { },
            off: () => { },
            emit: () => { },
            disconnect: () => { }
        };
        socket = stub; // Ensure getSocket() returns the stub too
        return stub;
    }

    if (!userId) return null;

    try {
        if (!socket) {
            socket = io(SOCKET_URL, {
                reconnection: true,
                reconnectionAttempts: 2,
                reconnectionDelay: 5000,
                transports: ['websocket'],
                timeout: 5000,
            });
        }

        if (socket) {
            socket.on('connect', () => {
                socket.emit('join', userId);
            });
            socket.on('connect_error', (err) => {
                console.warn("⚠️ Socket connection optional:", err.message);
            });
        }
        return socket;
    } catch (e) {
        return null;
    }
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
