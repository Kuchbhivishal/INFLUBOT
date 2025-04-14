import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SocketContext = createContext({
  socket: null,
  isConnected: false,
  sendMessage: () => {},
  lastMessage: null,
});

const API_BASE_URL = 'wss://api.influconnect.com/ws';

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const maxReconnectAttempts = 5;

  // Connect to WebSocket
  useEffect(() => {
    const connectWebSocket = async () => {
      if (!isAuthenticated || !user) return;

      try {
        const token = await AsyncStorage.getItem('@auth_token');
        const ws = new WebSocket(`${API_BASE_URL}?token=${token}`);
        
        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          
          // Send initial authentication message
          ws.send(JSON.stringify({
            type: 'auth',
            data: { userId: user.id }
          }));
        };
        
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          setLastMessage(message);
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        
        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          
          // Implement reconnection logic with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const timeout = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
            console.log(`Reconnecting in ${timeout}ms (attempt ${reconnectAttemptsRef.current + 1})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              connectWebSocket();
            }, timeout);
          }
        };
        
        setSocket(ws);
        
        // Cleanup function
        return () => {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close();
          }
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
        };
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
      }
    };

    if (isAuthenticated && user) {
      connectWebSocket();
    }
    
    return () => {
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isAuthenticated, user]);

  // Send message function
  const sendMessage = (type, data) => {
    if (socket && isConnected) {
      const message = JSON.stringify({ type, data });
      socket.send(message);
    } else {
      console.error('Cannot send message: WebSocket not connected');
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        sendMessage,
        lastMessage,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);