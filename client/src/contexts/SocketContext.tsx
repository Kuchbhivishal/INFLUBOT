import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { socketService } from "@/services/socketService";

interface SocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (type: string, data: any) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // State for reconnection
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    let webSocket: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let pingInterval: NodeJS.Timeout | null = null;

    const connectSocket = async () => {
      if (isAuthenticated && user) {
        try {
          // Close existing connection if any
          if (webSocket && webSocket.readyState !== WebSocket.CLOSED) {
            webSocket.close();
          }

          webSocket = socketService.connect();

          webSocket.onopen = () => {
            console.log("WebSocket connected");
            setIsConnected(true);
            setReconnectAttempt(0); // Reset reconnect attempts on successful connection

            // Send authentication message
            if (user) {
              webSocket?.send(JSON.stringify({
                type: 'auth',
                data: { userId: user.id }
              }));

              // Set online status if user is an influencer
              if (user.isInfluencer) {
                webSocket?.send(JSON.stringify({
                  type: 'status',
                  data: { isOnline: true }
                }));
              }
            }

            // Set up a ping interval to keep the connection alive
            pingInterval = setInterval(() => {
              if (webSocket && webSocket.readyState === WebSocket.OPEN) {
                webSocket.send(JSON.stringify({ type: 'ping' }));
              }
            }, 30000); // Every 30 seconds
          };

          webSocket.onclose = (event) => {
            console.log(`WebSocket disconnected: ${event.code} ${event.reason}`);
            setIsConnected(false);

            if (pingInterval) {
              clearInterval(pingInterval);
              pingInterval = null;
            }

            // Reconnect with exponential backoff
            if (reconnectTimer) {
              clearTimeout(reconnectTimer);
            }

            const maxDelay = 30000; // 30 seconds max
            const baseDelay = 1000; // Start with 1 second
            const delay = Math.min(baseDelay * Math.pow(1.5, reconnectAttempt), maxDelay);

            console.log(`Attempting to reconnect in ${delay/1000} seconds...`);

            reconnectTimer = setTimeout(() => {
              setReconnectAttempt(prev => prev + 1);
              connectSocket(); // Try to reconnect
            }, delay);
          };

          webSocket.onerror = (error) => {
            console.error("WebSocket error:", error);
            setIsConnected(false);
          };

          setSocket(webSocket);
        } catch (error) {
          console.error("WebSocket connection failed:", error);

          // Try to reconnect on error
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
          }

          reconnectTimer = setTimeout(() => {
            setReconnectAttempt(prev => prev + 1);
            connectSocket();
          }, 3000);
        }
      }
    };

    connectSocket();

    // Cleanup on unmount
    return () => {
      if (pingInterval) {
        clearInterval(pingInterval);
      }

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      if (webSocket) {
        // Send offline status if user is an influencer
        if (isAuthenticated && user && user.isInfluencer && webSocket.readyState === WebSocket.OPEN) {
          webSocket.send(JSON.stringify({
            type: 'status',
            data: { isOnline: false }
          }));
        }

        webSocket.close();
      }
    };
  }, [user, isAuthenticated, reconnectAttempt]);

  // Send message through WebSocket
  const sendMessage = (type: string, data: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, data }));
    } else {
      console.error("WebSocket is not connected");
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        sendMessage,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};