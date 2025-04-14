import { apiRequest } from "@/lib/queryClient";

export const authService = {
  // Get current authenticated user
  getCurrentUser: async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (response.status === 401) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error('Failed to get current user');
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  },
  
  // Login with Google
  loginWithGoogle: async () => {
    try {
      // In a real implementation, this would redirect to Google OAuth
      // For this demo, we'll simulate the Google auth flow with a direct API call
      
      const response = await apiRequest("POST", "/api/auth/google", {
        // This would normally come from Google OAuth response
        token: "simulated_google_token",
        profile: {
          email: "user@example.com",
          name: "Demo User",
          picture: "https://via.placeholder.com/150"
        }
      });
      
      return await response.json();
    } catch (error) {
      console.error("Google login error:", error);
      throw error;
    }
  },
  
  // Send OTP to phone number
  sendOtp: async (phoneNumber: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/send-otp", {
        phoneNumber
      });
      
      return await response.json();
    } catch (error) {
      console.error("Error sending OTP:", error);
      throw error;
    }
  },
  
  // Verify OTP
  verifyOtp: async (phoneNumber: string, otp: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/verify-otp", {
        phoneNumber,
        otp
      });
      
      return await response.json();
    } catch (error) {
      console.error("Error verifying OTP:", error);
      throw error;
    }
  },
  
  // Logout user
  logout: async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      return true;
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
    }
  }
};
