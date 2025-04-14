import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@shared/schema";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithOtp: (phoneNumber: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error("Failed to get current user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      const userData = await authService.loginWithGoogle();
      setUser(userData);
    } catch (error) {
      console.error("Google login failed:", error);
      toast({
        title: "Login failed",
        description: (error as Error).message || "Failed to login with Google",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOtp = async (phoneNumber: string, otp: string) => {
    try {
      setIsLoading(true);
      const userData = await authService.verifyOtp(phoneNumber, otp);
      setUser(userData);
    } catch (error) {
      console.error("OTP verification failed:", error);
      toast({
        title: "Verification failed",
        description: (error as Error).message || "Invalid OTP. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Logout failed",
        description: (error as Error).message || "Failed to logout",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithGoogle,
        loginWithOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
