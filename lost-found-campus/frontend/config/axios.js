import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { emit } from '../utils/events';

const getBaseUrl = () => {
    if (Platform.OS === 'web') {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        return `http://${hostname}:5000/api/`;
    }
    return 'http://127.0.0.1:5000/api/';
};

const API_BASE_URL = getBaseUrl();

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
