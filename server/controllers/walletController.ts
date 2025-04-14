import { Request, Response } from "express";
import { storage } from "../storage";

export const walletController = {
  // Get wallet for a user
  getWallet: async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get wallet
      let wallet = await storage.getWallet(userId);
      
      // If wallet doesn't exist, create one
      if (!wallet) {
        wallet = await storage.createWallet({
          userId,
          balance: 0
        });
      }
      
      return res.status(200).json(wallet);
    } catch (error) {
      console.error("Get wallet error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
  // Recharge wallet
  rechargeWallet: async (req: Request, res: Response) => {
    try {
      const { userId, amount, fee, type, status, metadata, interactionId } = req.body;
      
      if (!userId || amount === undefined) {
        return res.status(400).json({ message: "User ID and amount are required" });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get wallet
      let wallet = await storage.getWallet(userId);
      
      // If wallet doesn't exist, create one
      if (!wallet) {
        wallet = await storage.createWallet({
          userId,
          balance: 0
        });
      }
      
      // Process transaction based on type
      if (type === 'deposit') {
        // Add amount to wallet
        wallet = await storage.updateWallet(userId, wallet.balance + amount);
      } else if (type === 'charge') {
        // Deduct amount from wallet
        if (wallet.balance < amount) {
          return res.status(400).json({ message: "Insufficient balance" });
        }
        wallet = await storage.updateWallet(userId, wallet.balance - amount);
      } else {
        return res.status(400).json({ message: "Invalid transaction type" });
      }
      
      // Create transaction record
      const transaction = await storage.createTransaction({
        userId,
        amount,
        fee,
        type,
        status: status || 'completed',
        metadata: metadata || { timestamp: new Date().toISOString() }
      });
      
      // If interaction ID is provided, update the interaction cost
      if (interactionId) {
        const interaction = await storage.getInteraction(interactionId);
        
        if (interaction) {
          const newTotalCost = (interaction.totalCost || 0) + amount;
          await storage.updateInteraction(interactionId, { totalCost: newTotalCost });
        }
      }
      
      return res.status(200).json({ wallet, transaction });
    } catch (error) {
      console.error("Recharge wallet error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
  // Get transaction history
  getTransactions: async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get transactions
      const transactions = await storage.getTransactions(userId);
      
      return res.status(200).json(transactions);
    } catch (error) {
      console.error("Get transactions error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
};
