import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../api/authService';

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  userType: null, // 'user', 'influencer', or 'admin'
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState(null);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('@auth_token');
        const savedUserType = await AsyncStorage.getItem('@user_type');
        
        if (token) {
          // Get user data from API with token
          const userData = await authService.getCurrentUser();
          setUser(userData);
          setUserType(savedUserType);
        }
      } catch (error) {
        console.error('Failed to check login status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  // Login function
  const login = async (credentials, type) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      const { user, token } = response;
      
      // Save token and user type to AsyncStorage
      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@user_type', type);
      
      setUser(user);
      setUserType(type);
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData, type) => {
    setIsLoading(true);
    try {
      const response = await authService.register(userData);
      const { user, token } = response;
      
      // Save token and user type to AsyncStorage
      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@user_type', type);
      
      setUser(user);
      setUserType(type);
      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      
      // Clear token and user type from AsyncStorage
      await AsyncStorage.removeItem('@auth_token');
      await AsyncStorage.removeItem('@user_type');
      
      setUser(null);
      setUserType(null);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        userType,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);