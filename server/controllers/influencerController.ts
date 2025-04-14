import { Request, Response } from "express";
import { storage } from "../storage";

export const influencerController = {
  // Get all influencers
  getAllInfluencers: async (req: Request, res: Response) => {
    try {
      const influencers = await storage.getAllInfluencers();
      
      // Get user data for each influencer
      const users: Record<number, any> = {};
      
      for (const influencer of influencers) {
        const user = await storage.getUser(influencer.userId);
        if (user) {
          users[influencer.userId] = user;
        }
      }
      
      return res.status(200).json({ influencers, users });
    } catch (error) {
      console.error("Get all influencers error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
  // Get featured influencers
  getFeaturedInfluencers: async (req: Request, res: Response) => {
    try {
      const influencers = await storage.getFeaturedInfluencers();
      
      // Get user data for each influencer
      const users: Record<number, any> = {};
      
      for (const influencer of influencers) {
        const user = await storage.getUser(influencer.userId);
        if (user) {
          users[influencer.userId] = user;
        }
      }
      
      return res.status(200).json({ influencers, users });
    } catch (error) {
      console.error("Get featured influencers error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
  // Get influencers by category
  getInfluencersByCategory: async (req: Request, res: Response) => {
    try {
      const category = req.params.category;
      
      if (!category) {
        return res.status(400).json({ message: "Category is required" });
      }
      
      const influencers = await storage.getInfluencersByCategory(category);
      
      // Get user data for each influencer
      const users: Record<number, any> = {};
      
      for (const influencer of influencers) {
        const user = await storage.getUser(influencer.userId);
        if (user) {
          users[influencer.userId] = user;
        }
      }
      
      return res.status(200).json({ influencers, users });
    } catch (error) {
      console.error("Get influencers by category error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
  // Get influencer profile
  getInfluencerProfile: async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get influencer profile
      const influencer = await storage.getInfluencerProfile(userId);
      
      if (!influencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }
      
      // Get user data
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.status(200).json({ influencer, user });
    } catch (error) {
      console.error("Get influencer profile error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
  // Update influencer status
  updateStatus: async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { isOnline } = req.body;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      if (isOnline === undefined) {
        return res.status(400).json({ message: "isOnline status is required" });
      }
      
      // Check if user is an influencer
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.isInfluencer) {
        return res.status(400).json({ message: "User is not an influencer" });
      }
      
      // Update status
      const updatedProfile = await storage.updateInfluencerStatus(userId, isOnline);
      
      return res.status(200).json(updatedProfile);
    } catch (error) {
      console.error("Update influencer status error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
};
