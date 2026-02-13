import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from './UserContext';

const ThemeContext = createContext();

export const colors = {
    student: {
        light: {
            background: '#F8FAFC',
            card: '#FFFFFF',
            glassCard: 'rgba(255, 255, 255, 0.85)',
            text: '#0F172A',
            textSecondary: '#64748B',
            border: '#F1F5F9',
            primary: '#4F46E5', // Indigo
            primaryGradient: ['#4F46E5', '#6366F1'],
            accent: '#818CF8',
            success: '#10B981',
            danger: '#EF4444',
            warning: '#F59E0B',
            info: '#0EA5E9',
            shadow: 'rgba(79, 70, 229, 0.1)'
        },
        dark: {
            background: '#0F172A',
            card: '#1E293B',
            glassCard: 'rgba(30, 41, 59, 0.7)',
            text: '#F8FAFC',
            textSecondary: '#94A3B8',
            border: '#334155',
            primary: '#6366F1',
            primaryGradient: ['#6366F1', '#818CF8'],
            accent: '#A5B4FC',
            success: '#34D399',
            danger: '#F87171',
            warning: '#FBBF24',
            info: '#38BDF8',
            shadow: 'rgba(0, 0, 0, 0.3)'
        }
    },
    admin: {
        light: {
            background: '#FFF1F2', // Rose-50
            card: '#FFFFFF',
            glassCard: 'rgba(255, 255, 255, 0.9)',
            text: '#9F1239', // Rose-900
            textSecondary: '#BE123C', // Rose-700
            border: '#FFE4E6',
            primary: '#E11D48', // Rose-600
            primaryGradient: ['#E11D48', '#FB7185'],
            accent: '#FDA4AF',
            success: '#059669',
            danger: '#DC2626',
            warning: '#D97706',
            info: '#2563EB',
            shadow: 'rgba(225, 29, 72, 0.15)'
        },
        dark: {
            background: '#881337', // Rose-950 (very dark)
            card: '#9F1239', // Rose-900
            glassCard: 'rgba(159, 18, 57, 0.8)',
            text: '#FFF1F2',
            textSecondary: '#FDA4AF',
            border: '#BE123C',
            primary: '#FB7185',
            primaryGradient: ['#FB7185', '#FFF1F2'],
            accent: '#FECDD3',
            success: '#34D399',
            danger: '#F87171',
            warning: '#FBBF24',
            info: '#38BDF8',
            shadow: 'rgba(0, 0, 0, 0.4)'
        }
    }
};

export const ThemeProvider = ({ children }) => {
    const { dbUser } = useUser();
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Load theme when user changes or on mount
    useEffect(() => {
        loadTheme();
    }, [dbUser?._id]);

    const loadTheme = async () => {
        try {
            // Use user-specific key if logged in, else global
            const key = dbUser?._id ? `darkMode_${dbUser._id}` : 'darkMode_guest';
            const saved = await AsyncStorage.getItem(key);
            if (saved !== null) {
                setIsDarkMode(saved === 'true');
            } else {
                // Default to false if no preference found
                setIsDarkMode(false);
            }
        } catch (error) {
            console.log('Error loading theme:', error);
        }
    };

    const toggleTheme = async () => {
        const newValue = !isDarkMode;
        setIsDarkMode(newValue);
        try {
            const key = dbUser?._id ? `darkMode_${dbUser._id}` : 'darkMode_guest';
            await AsyncStorage.setItem(key, String(newValue));
        } catch (error) {
            console.log('Error saving theme:', error);
        }
    };

    const role = dbUser?.role === 'admin' ? 'admin' : 'student';
    const mode = isDarkMode ? 'dark' : 'light';
    const theme = colors[role][mode];

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme, colors, role }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
