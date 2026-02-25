import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { emit } from '../utils/events';

const getBaseUrl = () => {
    // 1. Check if we have a globally defined production URL (for Vercel/Netlify web builds)
    if (typeof window !== 'undefined' && window.BACKEND_API_URL) {
        return window.BACKEND_API_URL;
    }

    // 2. Production URL (Default Render instance)
    const PRODUCTION_URL = 'https://lostfound-backend-o5o3.onrender.com/api/';


    // 3. Optional: Dynamic detection for local dev
    // If you are using Expo Go on a physical device, change this to your computer's IP
    const LOCAL_IP = '192.168.1.1'; // Change to your local machine IP if needed
    const DEV_URL = `http://localhost:5000/api/`;

    // Default to Production URL for "Deployment Ready" state
    return PRODUCTION_URL;
};

const API_BASE_URL = getBaseUrl();
export const BACKEND_URL = API_BASE_URL.replace('/api/', '');

const apiClient = axios.create({

    baseURL: API_BASE_URL,
});

// Interceptor to add JWT Token to every request
apiClient.interceptors.request.use(async (config) => {
    try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.error("Axios interceptor error:", error);
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Handle 401 responses (logout user)
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('user');
            emit('logout'); // Notify UserContext to update state
        }
        return Promise.reject(error);
    }
);

export default apiClient;
