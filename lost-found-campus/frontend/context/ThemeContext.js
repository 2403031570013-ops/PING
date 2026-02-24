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
            background: '#0A0D14', // Deep Indigo Dark
            card: '#151921', // Surface card
            glassCard: 'rgba(21, 25, 33, 0.8)',
            text: '#FFFFFF',
            textSecondary: '#94A3B8',
            border: '#1C222D',
            primary: '#2D5BFF', // Indigo Blue
            primaryGradient: ['#2D5BFF', '#17A2B8'], // Indigo to Teal
            accent: '#17A2B8', // Teal
            success: '#10B981',
            danger: '#EF4444',
            warning: '#F59E0B',
            info: '#0EA5E9',
            shadow: 'rgba(0, 0, 0, 0.5)'
        }
    },
    admin: {
        light: {
            background: '#F1F5F9', // Blueish Slate
            card: '#FFFFFF',
            glassCard: 'rgba(255, 255, 255, 0.9)',
            text: '#1E293B',
            textSecondary: '#475569',
            border: '#E2E8F0',
            primary: '#B45309', // Deep Amber
            primaryGradient: ['#B45309', '#D97706'],
            accent: '#F59E0B',
            success: '#059669',
            danger: '#DC2626',
            warning: '#D97706',
            info: '#2563EB',
            shadow: 'rgba(180, 83, 9, 0.15)'
        },
        dark: {
            background: '#0A0D14', // Match Deep Indigo for consistency
            card: '#161B22',
            glassCard: 'rgba(22, 27, 34, 0.8)',
            text: '#F1F5F9',
            textSecondary: '#94A3B8',
            border: '#30363D',
            primary: '#F59E0B', // Bright Amber Gold
            primaryGradient: ['#F59E0B', '#FCD34D'],
            accent: '#FCD34D',
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
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isHighContrast, setIsHighContrast] = useState(false);
    const [isLargeText, setIsLargeText] = useState(false);

    // Load theme when user changes or on mount
    useEffect(() => {
        loadTheme();
    }, [dbUser?._id]);

    const loadTheme = async () => {
        try {
            const key = dbUser?._id ? `theme_prefs_${dbUser._id}` : 'theme_prefs_guest';
            const saved = await AsyncStorage.getItem(key);
            if (saved) {
                const prefs = JSON.parse(saved);
                setIsDarkMode(prefs.darkMode);
                setIsHighContrast(prefs.highContrast || false);
                setIsLargeText(prefs.largeText || false);
            }
        } catch (error) {
            console.log('Error loading theme:', error);
        }
    };

    const toggleTheme = () => updatePrefs({ darkMode: !isDarkMode });
    const toggleHighContrast = () => updatePrefs({ highContrast: !isHighContrast });
    const toggleLargeText = () => updatePrefs({ largeText: !isLargeText });

    const updatePrefs = async (newPrefs) => {
        const updated = {
            darkMode: newPrefs.hasOwnProperty('darkMode') ? newPrefs.darkMode : isDarkMode,
            highContrast: newPrefs.hasOwnProperty('highContrast') ? newPrefs.highContrast : isHighContrast,
            largeText: newPrefs.hasOwnProperty('largeText') ? newPrefs.largeText : isLargeText
        };

        if (newPrefs.hasOwnProperty('darkMode')) setIsDarkMode(newPrefs.darkMode);
        if (newPrefs.hasOwnProperty('highContrast')) setIsHighContrast(newPrefs.highContrast);
        if (newPrefs.hasOwnProperty('largeText')) setIsLargeText(newPrefs.largeText);

        try {
            const key = dbUser?._id ? `theme_prefs_${dbUser._id}` : 'theme_prefs_guest';
            await AsyncStorage.setItem(key, JSON.stringify(updated));
        } catch (error) {
            console.log('Error saving theme:', error);
        }
    };

    const role = dbUser?.role === 'admin' ? 'admin' : 'student';
    const mode = isDarkMode ? 'dark' : 'light';
    let theme = { ...colors[role][mode] };

    // Accessibility Overrides
    if (isHighContrast) {
        theme.background = isDarkMode ? '#000000' : '#FFFFFF';
        theme.card = isDarkMode ? '#000000' : '#FFFFFF';
        theme.text = isDarkMode ? '#FFFFFF' : '#000000';
        theme.textSecondary = isDarkMode ? '#FFFF00' : '#000000'; // Yellow/Black for high contrast
        theme.border = isDarkMode ? '#FFFFFF' : '#000000';
        theme.primary = isDarkMode ? '#FFFF00' : '#0000FF';
    }

    if (isLargeText) {
        // This is a simplistic way, usually text size is handled in components. 
        // We export a scaling factor.
        theme.fontScale = 1.3;
    } else {
        theme.fontScale = 1.0;
    }

    return (
        <ThemeContext.Provider value={{
            isDarkMode, toggleTheme,
            isHighContrast, toggleHighContrast,
            isLargeText, toggleLargeText,
            theme, colors, role
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
