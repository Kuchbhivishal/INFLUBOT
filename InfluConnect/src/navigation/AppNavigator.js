import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { useAuth } from '../contexts/AuthContext';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';
import UserTypeSelectionScreen from '../screens/auth/UserTypeSelectionScreen';

// Navigation stacks for different user types
import InfluencerTabs from './InfluencerTabs';
import UserTabs from './UserTabs';
import AdminTabs from './AdminTabs';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, isLoading, userType } = useAuth();
  const [initialRoute, setInitialRoute] = useState('Login');

  // If app is still checking login status, show loading screen
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        // Auth stack for unauthenticated users
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
          <Stack.Screen name="UserTypeSelection" component={UserTypeSelectionScreen} />
        </Stack.Navigator>
      ) : (
        // Render different navigation stacks based on user type
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {userType === 'influencer' && (
            <Stack.Screen name="InfluencerTabs" component={InfluencerTabs} />
          )}
          {userType === 'user' && (
            <Stack.Screen name="UserTabs" component={UserTabs} />
          )}
          {userType === 'admin' && (
            <Stack.Screen name="AdminTabs" component={AdminTabs} />
          )}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default AppNavigator;