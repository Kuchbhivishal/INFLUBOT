import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { WalletProvider } from './src/contexts/WalletContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AuthProvider>
        <SocketProvider>
          <WalletProvider>
            <AppNavigator />
          </WalletProvider>
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}