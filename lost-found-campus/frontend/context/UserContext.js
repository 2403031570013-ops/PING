import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../config/axios';
import { subscribe } from '../utils/events';

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

    const logout = async () => {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('user');
        setDbUser(null);
    };

    useEffect(() => {
        refreshUser();

        // Listen to global logout events (from axios 401)
        const unsubscribe = subscribe('logout', () => {
            console.log("Forced logout due to session expiry");
            logout();
        });

        return unsubscribe;
    }, []);

    return (
        <UserContext.Provider value={{ dbUser, setDbUser, refreshUser, loading, logout }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
