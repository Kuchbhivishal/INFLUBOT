import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.influconnect.com';

export const apiRequest = async (method, endpoint, data = null) => {
  try {
    const token = await AsyncStorage.getItem('@auth_token');
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
      method,
      headers,
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (response.status === 401) {
      // Handle unauthorized (token might be expired)
      await AsyncStorage.removeItem('@auth_token');
      throw new Error('Session expired. Please login again.');
    }
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Something went wrong');
    }
    
    return result;
  } catch (error) {
    console.error(`API Error (${method} ${endpoint}):`, error);
    throw error;
  }
};