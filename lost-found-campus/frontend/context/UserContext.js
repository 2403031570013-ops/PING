import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../config/axios';
import { subscribe } from '../utils/events';
import { initiateSocket, disconnectSocket } from '../utils/socket';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [dbUser, setDbUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');

            if (!token) {
                setDbUser(null);
                setLoading(false);
                return;
            }

            const response = await apiClient.get('/auth/profile');
            setDbUser(response.data);
        } catch (error) {
            console.error("Error refreshing user:", error);
            // Clear invalid token
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('user');
            setDbUser(null);
        } finally {
            setLoading(false);
        }
    };

    const [unreadMsgs, setUnreadMsgs] = useState(0);
    const [unreadNotifs, setUnreadNotifs] = useState(0);

    const refreshBadges = async () => {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) return;

        try {
            // Using a silent check to avoid console noise during network suspension
            const [msgRes, notifRes] = await Promise.all([
                apiClient.get('/chat/unread-total').catch(() => null),
                apiClient.get('/notifications/unread-count').catch(() => null)
            ]);

            if (msgRes) setUnreadMsgs(msgRes.data.totalUnread || 0);
            if (notifRes) setUnreadNotifs(notifRes.data.count || 0);
        } catch (e) {
            // Background sync failed - usually due to sleep/network change. Ignore.
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('user');
        setDbUser(null);
        setUnreadMsgs(0);
        setUnreadNotifs(0);
    };

    const [socket, setSocket] = useState(null);
    const [onboardingData, setOnboardingData] = useState(null);

    useEffect(() => {
        refreshUser();
        refreshBadges();
        loadOnboardingData();

        if (dbUser?._id) {
            const s = initiateSocket(dbUser._id);
            setSocket(s);

            // Listen for real-time notifications
            if (s && typeof s.on === 'function') {
                s.on('new-notification', (notif) => {
                    console.log("[Context] Real-time notification received:", notif.title);
                    setUnreadNotifs(prev => prev + 1);
                });
            }
        }

        // Polling for badges every 5 seconds
        const interval = setInterval(() => {
            if (dbUser) refreshBadges();
        }, 5000);

        // Listen to global logout events (from axios 401)
        const unsubscribe = subscribe('logout', () => {
            console.log("Forced logout due to session expiry");
            logout();
        });

        return () => {
            unsubscribe();
            clearInterval(interval);
            disconnectSocket();
            setSocket(null);
        };
    }, [dbUser?._id]);

    const loadOnboardingData = async () => {
        try {
            const saved = await AsyncStorage.getItem('temp_onboarding');
            if (saved) setOnboardingData(JSON.parse(saved));
        } catch (e) {
            console.log("Error loading onboarding data", e);
        }
    };

    const saveOnboardingData = async (data) => {
        setOnboardingData(data);
        await AsyncStorage.setItem('temp_onboarding', JSON.stringify(data));
    };

    return (
        <UserContext.Provider value={{
            dbUser, setDbUser, refreshUser,
            loading, logout,
            unreadMsgs, unreadNotifs, refreshBadges,
            socket,
            onboardingData, setOnboardingData: saveOnboardingData
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
