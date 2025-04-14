import { Request, Response } from "express";
import { storage } from "../storage";

export const callController = {
  // Get interaction by ID
  getInteraction: async (req: Request, res: Response) => {
    try {
      const interactionId = parseInt(req.params.id);
      
      if (isNaN(interactionId)) {
        return res.status(400).json({ message: "Invalid interaction ID" });
      }
      
      const interaction = await storage.getInteraction(interactionId);
      
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      
      // Get influencer data
      const influencer = await storage.getUser(interaction.influencerId);
      
      if (!influencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }
      
      return res.status(200).json({ interaction, influencer });
    } catch (error) {
      console.error("Get interaction error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
  // Create new interaction
  createInteraction: async (req: Request, res: Response) => {
    try {
      const { userId, influencerId, type, status } = req.body;
      
      if (!userId || !influencerId || !type || !status) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if influencer exists
      const influencer = await storage.getUser(influencerId);
      
      if (!influencer || !influencer.isInfluencer) {
        return res.status(404).json({ message: "Influencer not found" });
      }
      
      // Get influencer profile to get the price
      const influencerProfile = await storage.getInfluencerProfile(influencerId);
      
      if (!influencerProfile) {
        return res.status(404).json({ message: "Influencer profile not found" });
      }
      
      // Adjust price based on interaction type
      let pricePerMinute = influencerProfile.pricePerMinute;
      if (type === 'chat') {
        pricePerMinute *= 0.8; // 20% discount for chat
      } else if (type === 'video_call') {
        pricePerMinute *= 1.2; // 20% premium for video calls
      }
      
      // Create interaction
      const interaction = await storage.createInteraction({
        userId,
        influencerId,
        type,
        status,
        durationMinutes: 0,
        totalCost: pricePerMinute, // Initialize with price per minute
      });
      
      return res.status(201).json(interaction);
    } catch (error) {
      console.error("Create interaction error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
  // Update interaction
  updateInteraction: async (req: Request, res: Response) => {
    try {
      const interactionId = parseInt(req.params.id);
      
      if (isNaN(interactionId)) {
        return res.status(400).json({ message: "Invalid interaction ID" });
      }
      
      const interaction = await storage.getInteraction(interactionId);
      
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      
      // Update interaction
      const updatedInteraction = await storage.updateInteraction(interactionId, req.body);
      
      return res.status(200).json(updatedInteraction);
    } catch (error) {
      console.error("Update interaction error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
  // Get interactions for a user
  getUserInteractions: async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const interactions = await storage.getUserInteractions(userId);
      
      return res.status(200).json(interactions);
    } catch (error) {
      console.error("Get user interactions error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
  // Get chat messages for an interaction
  getChatMessages: async (req: Request, res: Response) => {
    try {
      const interactionId = parseInt(req.params.interactionId);
      
      if (isNaN(interactionId)) {
        return res.status(400).json({ message: "Invalid interaction ID" });
      }
      
      const messages = await storage.getChatMessages(interactionId);
      
      // Add sender information to each message
      const messagesWithSenders = await Promise.all(
        messages.map(async (message) => {
          const sender = await storage.getUser(message.senderId);
          return {
            ...message,
            senderName: sender ? (sender.fullName || sender.username) : "Unknown User"
          };
        })
      );
      
      return res.status(200).json(messagesWithSenders);
    } catch (error) {
      console.error("Get chat messages error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
  // Create new chat message
  createChatMessage: async (req: Request, res: Response) => {
    try {
      const interactionId = parseInt(req.params.interactionId);
      const { senderId, content } = req.body;
      
      if (isNaN(interactionId) || !senderId || !content) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if interaction exists
      const interaction = await storage.getInteraction(interactionId);
      
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      
      // Create message
      const message = await storage.createChatMessage({
        interactionId,
        senderId,
        content
      });
      
      // Get sender information
      const sender = await storage.getUser(senderId);
      
      return res.status(201).json({
        ...message,
        senderName: sender ? (sender.fullName || sender.username) : "Unknown User"
      });
    } catch (error) {
      console.error("Create chat message error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
};
