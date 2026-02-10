import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const colors = {
    light: {
        background: '#f0f2f5',
        card: '#ffffff',
        text: '#1a1a1a',
        textSecondary: '#666666',
        border: '#e0e0e0',
        primary: '#667eea',
        primaryGradient: ['#667eea', '#764ba2'],
        success: '#34c759',
        danger: '#ff3b30',
        warning: '#ff9500',
    },
    dark: {
        background: '#121212',
        card: '#1e1e1e',
        text: '#ffffff',
        textSecondary: '#a0a0a0',
        border: '#333333',
        primary: '#667eea',
        primaryGradient: ['#667eea', '#764ba2'],
        success: '#32d74b',
        danger: '#ff453a',
        warning: '#ff9f0a',
    }
};

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const saved = await AsyncStorage.getItem('darkMode');
            if (saved !== null) {
                setIsDarkMode(saved === 'true');
            }
        } catch (error) {
            console.log('Error loading theme:', error);
        }
    };

    const toggleTheme = async () => {
        const newValue = !isDarkMode;
        setIsDarkMode(newValue);
        try {
            await AsyncStorage.setItem('darkMode', String(newValue));
        } catch (error) {
            console.log('Error saving theme:', error);
        }
    };

    const theme = isDarkMode ? colors.dark : colors.light;

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
