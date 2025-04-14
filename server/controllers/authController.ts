import { Request, Response } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";

// Simulates OTP storage (in a real app this would be a database or redis)
const otpStore = new Map<string, string>();

export const authController = {
  // Login with username/password
  login: async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Find user by username
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // In a real app, would use bcrypt to compare passwords
      if (user.password !== password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Update last login time
      await storage.updateUser(user.id, { lastLoginAt: new Date() });
      
      // In a real app, would generate and return a JWT token
      // Here we'll simulate a session by attaching user to the response
      return res.status(200).json(user);
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
  // Google OAuth login
  googleAuth: async (req: Request, res: Response) => {
    try {
      const { token, profile } = req.body;
      
      if (!profile || !profile.email) {
        return res.status(400).json({ message: "Invalid Google profile data" });
      }
      
      // Check if user exists by Google ID
      let user = await storage.getUserByGoogleId(token);
      
      // If not, check by email
      if (!user) {
        user = await storage.getUserByEmail(profile.email);
      }
      
      if (user) {
        // User exists, update their Google ID if needed
        if (!user.googleId) {
          user = await storage.updateUser(user.id, { 
            googleId: token,
            lastLoginAt: new Date() 
          });
        } else {
          // Just update last login time
          user = await storage.updateUser(user.id, { lastLoginAt: new Date() });
        }
      } else {
        // Create new user
        const username = profile.email.split('@')[0] + Math.floor(Math.random() * 1000);
        
        user = await storage.createUser({
          username,
          password: "", // Google users don't need a password
          email: profile.email,
          fullName: profile.name,
          profileImage: profile.picture,
          googleId: token,
          phoneNumber: "",
          isInfluencer: false
        });
        
        // Create wallet for new user
        await storage.createWallet({
          userId: user.id,
          balance: 0
        });
      }
      
      return res.status(200).json(user);
    } catch (error) {
      console.error("Google auth error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
  // Send OTP to phone number
  sendOtp: async (req: Request, res: Response) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // In a real app, this would send an SMS using a service like Twilio
      console.log(`[SMS Simulation] Sending OTP ${otp} to ${phoneNumber}`);
      
      // Store OTP for verification (with 10 minute expiry)
      otpStore.set(phoneNumber, otp);
      setTimeout(() => otpStore.delete(phoneNumber), 10 * 60 * 1000);
      
      return res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
      console.error("Send OTP error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
  // Verify OTP
  verifyOtp: async (req: Request, res: Response) => {
    try {
      const { phoneNumber, otp } = req.body;
      
      if (!phoneNumber || !otp) {
        return res.status(400).json({ message: "Phone number and OTP are required" });
      }
      
      // Check if OTP matches
      const storedOtp = otpStore.get(phoneNumber);
      
      // For development, allow "123456" as a valid OTP for any phone number
      if (otp !== storedOtp && otp !== "123456") {
        return res.status(401).json({ message: "Invalid OTP" });
      }
      
      // Clear OTP after successful verification
      otpStore.delete(phoneNumber);
      
      // Check if user exists
      let user = await storage.getUserByPhone(phoneNumber);
      
      if (user) {
        // Update last login
        user = await storage.updateUser(user.id, { lastLoginAt: new Date() });
      } else {
        // Create new user with phone number
        const username = `user${Math.floor(Math.random() * 10000)}`;
        
        try {
          const userData = insertUserSchema.parse({
            username,
            password: "",
            phoneNumber,
            isInfluencer: false
          });
          
          user = await storage.createUser(userData);
          
          // Create wallet for new user
          await storage.createWallet({
            userId: user.id,
            balance: 0
          });
        } catch (error) {
          console.error("Error creating user:", error);
          return res.status(400).json({ message: "Invalid user data" });
        }
      }
      
      return res.status(200).json(user);
    } catch (error) {
      console.error("Verify OTP error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
  // Get currently authenticated user
  getCurrentUser: async (req: Request, res: Response) => {
    try {
      // In a real app, would get the user ID from the JWT token
      // Here we'll return a mock/placeholder user ID.
      // Normally you would use req.user from passport or similar
      
      // If authorization header is present, try to get user ID from it
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = parseInt(authHeader.replace('Bearer ', ''));
      
      if (isNaN(userId)) {
        return res.status(401).json({ message: "Invalid authentication" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      return res.status(200).json(user);
    } catch (error) {
      console.error("Get current user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
  // Logout user
  logout: async (req: Request, res: Response) => {
    // In a real app, would invalidate the JWT token
    // Here we just send a success response
    return res.status(200).json({ message: "Logged out successfully" });
  }
};
