import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './apiClient';

const authService = {
  // Login with username and password
  login: async (credentials) => {
    const response = await apiRequest('POST', '/api/auth/login', credentials);
    if (response.token) {
      await AsyncStorage.setItem('@auth_token', response.token);
    }
    return response;
  },

  // Register new user
  register: async (userData) => {
    const response = await apiRequest('POST', '/api/auth/register', userData);
    if (response.token) {
      await AsyncStorage.setItem('@auth_token', response.token);
    }
    return response;
  },

  // Login with Google
  googleLogin: async (token) => {
    const response = await apiRequest('POST', '/api/auth/google', { token });
    if (response.token) {
      await AsyncStorage.setItem('@auth_token', response.token);
    }
    return response;
  },

  // OTP verification
  sendOtp: async (phoneNumber) => {
    return await apiRequest('POST', '/api/auth/send-otp', { phoneNumber });
  },

  verifyOtp: async (phoneNumber, otp) => {
    const response = await apiRequest('POST', '/api/auth/verify-otp', { phoneNumber, otp });
    if (response.token) {
      await AsyncStorage.setItem('@auth_token', response.token);
    }
    return response;
  },

  // Get current user
  getCurrentUser: async () => {
    return await apiRequest('GET', '/api/auth/me');
  },

  // Logout
  logout: async () => {
    await apiRequest('POST', '/api/auth/logout');
    await AsyncStorage.removeItem('@auth_token');
  },
};

export default authService;