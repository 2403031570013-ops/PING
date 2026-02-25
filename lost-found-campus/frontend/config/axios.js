import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { emit } from '../utils/events';

// Production URL (Default Render instance)
const PRODUCTION_URL = 'https://lostfound-backend-o5o3.onrender.com/api/';

export const BACKEND_URL = PRODUCTION_URL.replace('/api/', '').replace(/\/$/, '');

const apiClient = axios.create({
    baseURL: PRODUCTION_URL,
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
