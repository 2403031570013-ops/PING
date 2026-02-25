import io from 'socket.io-client';
import { Platform } from 'react-native';
import { BACKEND_URL } from '../config/axios';

const SOCKET_URL = BACKEND_URL;

let socket;

export const initiateSocket = (userId) => {
    // Removed web stub to enable real-time features in browser
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
