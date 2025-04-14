import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { authController } from "./controllers/authController";
import { userController } from "./controllers/userController";
import { walletController } from "./controllers/walletController";
import { influencerController } from "./controllers/influencerController";
import { callController } from "./controllers/callController";

// Types for WebSocket messages
type MessageType = 
  "auth" | 
  "status" | 
  "chat" | 
  "ping" | 
  "pong" | 
  // WebRTC signaling
  "call-offer" | 
  "call-answer" | 
  "call-ice-candidate" | 
  "call-end" |
  // Call control messages
  "call-request" |  // Initial call request (with call type - audio/video)
  "call-accept" |   // Recipient accepts the call
  "call-reject" |   // Recipient rejects the call
  "call-busy" |     // Recipient is busy
  "call-cancel" |   // Caller cancels the call
  "call-audio-toggle" | // Toggle audio mute/unmute
  "call-video-toggle";  // Toggle video on/off

interface WSMessage {
  type: MessageType;
  data: any;
}

// Map of user IDs to WebSocket connections
const userSockets = new Map<number, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", authController.login);
  app.post("/api/auth/google", authController.googleAuth);
  app.post("/api/auth/send-otp", authController.sendOtp);
  app.post("/api/auth/verify-otp", authController.verifyOtp);
  app.get("/api/auth/me", authController.getCurrentUser);
  app.post("/api/auth/logout", authController.logout);

  // User routes
  app.get("/api/users/:id", userController.getUser);
  app.patch("/api/users/:id", userController.updateUser);

  // Wallet routes
  app.get("/api/wallets/:userId", walletController.getWallet);
  app.post("/api/wallets/recharge", walletController.rechargeWallet);
  app.get("/api/transactions/:userId", walletController.getTransactions);

  // Influencer routes
  app.get("/api/influencers", influencerController.getAllInfluencers);
  app.get("/api/influencers/featured", influencerController.getFeaturedInfluencers);
  app.get("/api/influencers/category/:category", influencerController.getInfluencersByCategory);
  app.get("/api/influencers/:userId", influencerController.getInfluencerProfile);
  app.patch("/api/influencers/:userId/status", influencerController.updateStatus);

  // Interaction routes
  app.get("/api/interactions/:id", callController.getInteraction);
  app.post("/api/interactions", callController.createInteraction);
  app.patch("/api/interactions/:id", callController.updateInteraction);
  app.get("/api/users/:userId/interactions", callController.getUserInteractions);
  app.get("/api/interactions/:interactionId/messages", callController.getChatMessages);
  app.post("/api/interactions/:interactionId/messages", callController.createChatMessage);
  
  // Special route for the chat test page
  app.post("/api/test/interactions", async (req, res) => {
    try {
      const { userId, influencerId, type = "chat", totalCost = 0 } = req.body;
      
      if (!userId || !influencerId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Check if there's an existing interaction between these users
      let existingInteractions = await storage.getUserInteractions(userId);
      let interaction = existingInteractions.find(i => 
        i.userId === userId && 
        i.influencerId === influencerId && 
        i.status !== "completed"
      );
      
      if (!interaction) {
        // Create a new interaction
        interaction = await storage.createInteraction({
          userId,
          influencerId,
          type,
          status: "active",
          totalCost,
          durationMinutes: 0
        });
        
        console.log(`Created new interaction #${interaction.id} between User ${userId} and Influencer ${influencerId}`);
      } else {
        // Make sure the interaction is active
        if (interaction.status !== "active") {
          interaction = await storage.updateInteraction(interaction.id, { 
            status: "active", 
            endedAt: null 
          });
          console.log(`Reactivated interaction #${interaction.id} between User ${userId} and Influencer ${influencerId}`);
        } else {
          console.log(`Using existing active interaction #${interaction.id} between User ${userId} and Influencer ${influencerId}`);
        }
      }
      
      res.status(201).json(interaction);
    } catch (error) {
      console.error("Error creating test interaction:", error);
      res.status(500).json({ error: "Failed to create interaction" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Handle WebSocket connections
    console.log('WebSocket connection established');
    
    let userId: number | null = null;
    
    // Check for userId in URL query parameters (for test environment)
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const urlUserId = url.searchParams.get('userId');
    if (urlUserId && !isNaN(parseInt(urlUserId))) {
      userId = parseInt(urlUserId);
      userSockets.set(userId, ws);
      (ws as any).userId = userId; // Store userId on the WebSocket object for reference
      console.log(`User ${userId} connected to WebSocket via URL param`);
      
      // For our demo users (5 = Sarah, 1 = Emma), set influencer status
      if (userId === 1) {
        // This is Emma (the influencer)
        console.log("Influencer Emma (ID: 1) connected to WebSocket");
        // Update influencer online status
        // Since we know userId is not null at this point, we can safely assert it's a number
        const influencerId = userId as number;
        storage.updateInfluencerStatus(influencerId, true)
          .then(() => {
            broadcastStatusChange(influencerId, true);
          })
          .catch(err => {
            console.error('Error updating influencer status:', err);
          });
      } else if (userId === 5) {
        console.log("User Sarah (ID: 5) connected to WebSocket");
      }
    }

    ws.on('message', async (message: string) => {
      try {
        const parsedMessage: WSMessage = JSON.parse(message);
        
        // Handle ping messages to keep connection alive
        if (parsedMessage.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return; // Skip further processing
        }
        
        // Handle authentication message to identify the user
        if (parsedMessage.type === 'auth') {
          userId = parsedMessage.data.userId;
          
          if (userId !== null) {
            userSockets.set(userId, ws);
            console.log(`User ${userId} connected to WebSocket`);
          }
        }
        
        // Handle status changes for influencers
        if (parsedMessage.type === 'status' && userId) {
          const isOnline = parsedMessage.data.isOnline;
          
          // Update influencer status in storage
          if (userId !== null) {
            try {
              await storage.updateInfluencerStatus(userId, isOnline);
              // Broadcast status change to all connected clients
              broadcastStatusChange(userId as number, isOnline);
            } catch (error) {
              console.error('Error updating influencer status:', error);
            }
          }
        }
        
        // Handle chat messages
        if (parsedMessage.type === 'chat' && userId) {
          const { interactionId, recipientId, content } = parsedMessage.data;
          
          try {
            const sender = await storage.getUser(userId);
            const recipient = await storage.getUser(recipientId);
            
            if (!sender || !recipient) {
              throw new Error("Invalid sender or recipient");
            }
            
            // Check if this is a regular user (not an influencer) sending to an influencer
            if (sender && !sender.isInfluencer && recipient && recipient.isInfluencer) {
              // This is a user sending to an influencer, so we need to check and deduct wallet balance
              const userWallet = await storage.getWallet(userId);
              
              if (!userWallet) {
                // No wallet - send error message to user
                const senderWs = userSockets.get(userId);
                if (senderWs && senderWs.readyState === WebSocket.OPEN) {
                  senderWs.send(JSON.stringify({
                    type: 'error',
                    data: {
                      message: "You need to create a wallet before sending messages to influencers."
                    }
                  }));
                }
                return;
              }
              
              // Each message costs 20 rupees
              const messageCost = 20;
              
              if (userWallet.balance < messageCost) {
                // Insufficient balance - send error message to user
                const senderWs = userSockets.get(userId);
                if (senderWs && senderWs.readyState === WebSocket.OPEN) {
                  senderWs.send(JSON.stringify({
                    type: 'error',
                    data: {
                      message: `Insufficient balance. You need ${messageCost} rupees to send a message. Your current balance is ${userWallet.balance} rupees.`
                    }
                  }));
                }
                return;
              }
              
              // Deduct from wallet
              const newBalance = userWallet.balance - messageCost;
              await storage.updateWallet(userId, newBalance);
              
              // Create transaction record
              await storage.createTransaction({
                userId,
                type: "message_fee",
                status: "completed",
                amount: messageCost,
                fee: 0,
                metadata: {
                  interactionId,
                  recipientId
                }
              });
              
              console.log(`Deducted ${messageCost} rupees from User ${userId}'s wallet. New balance: ${newBalance}`);
              
              // Notify user about the deduction
              const senderWs = userSockets.get(userId);
              if (senderWs && senderWs.readyState === WebSocket.OPEN) {
                senderWs.send(JSON.stringify({
                  type: 'wallet_update',
                  data: {
                    balance: newBalance,
                    deduction: messageCost,
                    reason: "Message fee"
                  }
                }));
              }
            }
            
            // Save message to storage - this happens regardless of user type
            const newMessage = await storage.createChatMessage({
              interactionId,
              senderId: userId,
              content
            });
            
            // Get sender info to include in the message
            const senderInfo = await storage.getUser(userId);
            const enrichedMessage = {
              ...newMessage,
              senderName: senderInfo?.fullName || senderInfo?.username,
              senderImage: senderInfo?.profileImage,
            };
            
            console.log(`Chat message from User ${userId} to User ${recipientId}: ${content}`);
            
            // Forward message to recipient if online - this happens for all messages
            const recipientWs = userSockets.get(recipientId);
            console.log(`Trying to forward message to recipient ${recipientId}, online status: ${!!recipientWs}`);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              recipientWs.send(JSON.stringify({
                type: 'chat',
                data: enrichedMessage
              }));
              console.log(`Message forwarded to recipient ${recipientId}`);
            } else {
              console.log(`Recipient ${recipientId} is not online or socket not open`);
            }
            
            // Also send back to sender for confirmation
            const senderWs = userSockets.get(userId);
            if (senderWs && senderWs.readyState === WebSocket.OPEN) {
              senderWs.send(JSON.stringify({
                type: 'chat',
                data: enrichedMessage
              }));
            }
          } catch (error) {
            console.error('Error processing message:', error);
            
            // Notify user of error
            const senderWs = userSockets.get(userId);
            if (senderWs && senderWs.readyState === WebSocket.OPEN) {
              senderWs.send(JSON.stringify({
                type: 'error',
                data: {
                  message: "Failed to send message. Please try again."
                }
              }));
            }
          }
        }
        
        // Handle WebRTC call signaling
        if (parsedMessage.type.startsWith('call-') && userId) {
          // Make sure recipientId exists in the message data
          if (!parsedMessage.data || !parsedMessage.data.recipientId) {
            console.error('Missing recipientId in call message:', parsedMessage);
            return;
          }
          
          const { recipientId } = parsedMessage.data;
          
          // Skip if recipientId is not valid or not a number
          if (!recipientId || isNaN(Number(recipientId))) {
            console.error('Invalid recipientId in call message:', recipientId);
            return;
          }
          
          const parsedRecipientId = Number(recipientId);
          const recipientWs = userSockets.get(parsedRecipientId);
          
          // Handle call request specifically - charge for calls
          if (parsedMessage.type === 'call-request') {
            try {
              console.log(`Call request from User ${userId} to User ${parsedRecipientId}`);
              
              // Always use hardcoded user IDs for the demo since we're not using a real DB
              let sender;
              let recipient;
              
              // For the demo User/Influencer setup
              if (userId === 5) {
                sender = { 
                  id: 5, 
                  fullName: "Sarah Williams", 
                  isInfluencer: false
                };
                recipient = { 
                  id: 1, 
                  fullName: "Emma Johnson", 
                  isInfluencer: true
                };
              } else if (userId === 1) {
                sender = { 
                  id: 1, 
                  fullName: "Emma Johnson", 
                  isInfluencer: true 
                };
                recipient = { 
                  id: 5, 
                  fullName: "Sarah Williams", 
                  isInfluencer: false
                };
              } else {
                console.log(`Using DB lookup for users...`);
                sender = await storage.getUser(userId);
                recipient = await storage.getUser(parsedRecipientId);
              }
              
              if (!sender) {
                console.log(`Sender user ${userId} not found, this should not happen!`);
                return;
              }
              
              if (!recipient) {
                console.log(`Recipient user ${parsedRecipientId} not found, this should not happen!`);
                
                // Send error back to sender
                const senderWs = userSockets.get(userId);
                if (senderWs && senderWs.readyState === WebSocket.OPEN) {
                  senderWs.send(JSON.stringify({
                    type: 'error',
                    data: {
                      message: "Recipient not found"
                    }
                  }));
                }
                return;
              }
              
              // Get call type (audio or video)
              const { callType, interactionId } = parsedMessage.data;
              console.log(`Call ${callType} request from User ${userId} to User ${parsedRecipientId}`);
              
              // If this is a user calling an influencer, check wallet
              if (sender && !sender.isInfluencer && recipient && recipient.isInfluencer) {
                const userWallet = await storage.getWallet(userId);
                
                if (!userWallet) {
                  // No wallet - send error message to user
                  const senderWs = userSockets.get(userId);
                  if (senderWs && senderWs.readyState === WebSocket.OPEN) {
                    senderWs.send(JSON.stringify({
                      type: 'error',
                      data: {
                        message: "You need to create a wallet before calling influencers."
                      }
                    }));
                  }
                  return;
                }
                
                // Each call minute costs different amounts based on type
                const callCostPerMinute = callType === 'audio' ? 100 : 200; // Audio: 100 Rs/min, Video: 200 Rs/min
                const minimumBalance = callCostPerMinute; // Require at least 1 minute worth of balance
                
                // Skip balance check for testing
                // if (userWallet.balance < minimumBalance) {
                //   // Insufficient balance - send error message to user
                //   const senderWs = userSockets.get(userId);
                //   if (senderWs && senderWs.readyState === WebSocket.OPEN) {
                //     senderWs.send(JSON.stringify({
                //       type: 'error',
                //       data: {
                //         message: `Insufficient balance. You need at least ${minimumBalance} rupees to start a ${callType} call. Your current balance is ${userWallet.balance} rupees.`
                //       }
                //     }));
                //   }
                //   return;
                // }
                
                // Attach cost info to the call request
                parsedMessage.data.callCostPerMinute = callCostPerMinute;
              }
              
              // Add caller information to the message
              parsedMessage.data.callerId = userId;
              parsedMessage.data.callerName = sender.fullName || `User ${userId}`;
              
            } catch (error) {
              console.error('Error processing call request:', error);
              return;
            }
          }
          
          // Forward all call-related messages to the recipient
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            // Always standardize field names to ensure consistency
            if (parsedMessage.type === 'call-request') {
              // Make sure all required call fields are present
              parsedMessage.data.callerId = userId;
              parsedMessage.data.senderId = userId;
              
              // Ensure we're using standard field names
              console.log("Standardizing call-request fields before forwarding:", parsedMessage.data);
            } else if (!parsedMessage.data.senderId) {
              // For all other message types, ensure senderId is present
              parsedMessage.data.senderId = userId;
            }
            
            try {
              const sender = await storage.getUser(userId);
              if (sender) {
                parsedMessage.data.senderName = sender.fullName || `User ${userId}`;
              } else {
                parsedMessage.data.senderName = `User ${userId}`;
              }
            } catch (error) {
              console.error('Error getting sender info:', error);
              parsedMessage.data.senderName = `User ${userId}`;
            }
            
            // Forward the signaling message to the recipient
            try {
              recipientWs.send(JSON.stringify(parsedMessage));
              console.log(`Call signaling message forwarded to recipient ${parsedRecipientId}`);
            } catch (error) {
              console.error('Error forwarding call message:', error);
            }
          } else {
            // If recipient is not online, send busy status back to caller
            console.log(`Recipient ${parsedRecipientId} is not online or socket not open`);
            const senderWs = userSockets.get(userId);
            if (senderWs && senderWs.readyState === WebSocket.OPEN) {
              senderWs.send(JSON.stringify({
                type: 'call-busy',
                data: {
                  recipientId: parsedRecipientId,
                  reason: 'offline'
                }
              }));
            }
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', async () => {
      if (userId) {
        console.log(`User ${userId} disconnected from WebSocket`);
        
        // Remove from connected users
        userSockets.delete(userId);
        
        // If user is an influencer, update their status to offline
        if (userId !== null) {
          try {
            const user = await storage.getUser(userId);
            if (user && user.isInfluencer) {
              await storage.updateInfluencerStatus(userId as number, false);
              broadcastStatusChange(userId as number, false);
            }
          } catch (error) {
            console.error('Error updating influencer status on disconnect:', error);
          }
        }
      }
    });
  });

  // Helper function to broadcast influencer status changes
  function broadcastStatusChange(influencerId: number, isOnline: boolean) {
    const statusMessage = JSON.stringify({
      type: 'status',
      data: {
        influencerId,
        isOnline
      }
    });
    
    // Send to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(statusMessage);
      }
    });
  }

  return httpServer;
}
