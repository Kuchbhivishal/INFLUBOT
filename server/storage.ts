import { 
  users, transactions, wallets, interactions, influencerProfiles, chatMessages,
  type User, type InsertUser, type Wallet, type InsertWallet, 
  type Transaction, type InsertTransaction, type Interaction, 
  type InsertInteraction, type InfluencerProfile, type InsertInfluencerProfile,
  type ChatMessage, type InsertChatMessage
} from "@shared/schema";

export interface IStorage {
  // User Methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;

  // Wallet Methods
  getWallet(userId: number): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWallet(userId: number, balance: number): Promise<Wallet>;

  // Transaction Methods
  getTransactions(userId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  updateTransaction(id: number, status: string): Promise<Transaction>;

  // Influencer Methods
  getInfluencerProfile(userId: number): Promise<InfluencerProfile | undefined>;
  getAllInfluencers(): Promise<InfluencerProfile[]>;
  getInfluencersByCategory(category: string): Promise<InfluencerProfile[]>;
  createInfluencerProfile(profile: InsertInfluencerProfile): Promise<InfluencerProfile>;
  updateInfluencerStatus(userId: number, isOnline: boolean): Promise<InfluencerProfile>;
  getFeaturedInfluencers(): Promise<InfluencerProfile[]>;

  // Interaction Methods
  getInteraction(id: number): Promise<Interaction | undefined>;
  getUserInteractions(userId: number): Promise<Interaction[]>;
  getInfluencerInteractions(influencerId: number): Promise<Interaction[]>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  updateInteraction(id: number, updates: Partial<Interaction>): Promise<Interaction>;

  // Chat Methods
  getChatMessages(interactionId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private wallets: Map<number, Wallet>;
  private transactions: Map<number, Transaction>;
  private influencerProfiles: Map<number, InfluencerProfile>;
  private interactions: Map<number, Interaction>;
  private chatMessages: Map<number, ChatMessage>;
  
  private currentUserId: number;
  private currentWalletId: number;
  private currentTransactionId: number;
  private currentInfluencerProfileId: number;
  private currentInteractionId: number;
  private currentChatMessageId: number;

  constructor() {
    this.users = new Map();
    this.wallets = new Map();
    this.transactions = new Map();
    this.influencerProfiles = new Map();
    this.interactions = new Map();
    this.chatMessages = new Map();
    
    this.currentUserId = 1;
    this.currentWalletId = 1;
    this.currentTransactionId = 1;
    this.currentInfluencerProfileId = 1;
    this.currentInteractionId = 1;
    this.currentChatMessageId = 1;

    // Initialize with sample influencers for development
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample influencers
    const influencers = [
      {
        id: this.currentUserId++,
        username: "sarahjohnson",
        password: "",
        email: "sarah@example.com",
        fullName: "Sarah Johnson",
        profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80",
        phoneNumber: "",
        isInfluencer: true,
        createdAt: new Date(),
        googleId: "",
        lastLoginAt: new Date()
      },
      {
        id: this.currentUserId++,
        username: "alexturner",
        password: "",
        email: "alex@example.com",
        fullName: "Alex Turner",
        profileImage: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80",
        phoneNumber: "",
        isInfluencer: true,
        createdAt: new Date(),
        googleId: "",
        lastLoginAt: new Date()
      },
      {
        id: this.currentUserId++,
        username: "priyasharma",
        password: "",
        email: "priya@example.com",
        fullName: "Priya Sharma",
        profileImage: "https://images.unsplash.com/photo-1587723958656-ee042cc565a1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80",
        phoneNumber: "",
        isInfluencer: true,
        createdAt: new Date(),
        googleId: "",
        lastLoginAt: new Date()
      },
      {
        id: this.currentUserId++,
        username: "marcuslee",
        password: "",
        email: "marcus@example.com",
        fullName: "Marcus Lee",
        profileImage: "https://images.unsplash.com/photo-1591258739299-5b65d5cbb235?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80",
        phoneNumber: "",
        isInfluencer: true,
        createdAt: new Date(),
        googleId: "",
        lastLoginAt: new Date()
      }
    ];

    // Add influencers to users map
    influencers.forEach(influencer => {
      this.users.set(influencer.id, influencer);
    });

    // Add influencer profiles
    const categories = ["Fashion & Lifestyle", "Gaming Expert", "Fitness Coach", "Tech Reviewer"];
    const prices = [100, 80, 150, 120];
    const ratings = [4.8, 4.6, 4.9, 4.7];
    const ratingCounts = [243, 167, 312, 198];
    const isOnline = [true, false, true, false];

    influencers.forEach((influencer, index) => {
      const profile: InfluencerProfile = {
        id: this.currentInfluencerProfileId++,
        userId: influencer.id,
        category: categories[index],
        bio: `Professional ${categories[index]}`,
        pricePerMinute: prices[index],
        ratingAvg: ratings[index],
        ratingCount: ratingCounts[index],
        isOnline: isOnline[index],
        lastSeenAt: new Date(),
      };

      this.influencerProfiles.set(profile.id, profile);
    });
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.phoneNumber === phoneNumber,
    );
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId,
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const newUser: User = { ...user, id, createdAt: new Date(), lastLoginAt: new Date() };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Wallet Methods
  async getWallet(userId: number): Promise<Wallet | undefined> {
    return Array.from(this.wallets.values()).find(
      (wallet) => wallet.userId === userId,
    );
  }

  async createWallet(wallet: InsertWallet): Promise<Wallet> {
    const id = this.currentWalletId++;
    const newWallet: Wallet = { ...wallet, id, updatedAt: new Date() };
    this.wallets.set(id, newWallet);
    return newWallet;
  }

  async updateWallet(userId: number, balance: number): Promise<Wallet> {
    const wallet = await this.getWallet(userId);
    if (!wallet) {
      throw new Error(`Wallet for user ${userId} not found`);
    }

    const updatedWallet: Wallet = { 
      ...wallet, 
      balance, 
      updatedAt: new Date() 
    };
    
    this.wallets.set(wallet.id, updatedWallet);
    return updatedWallet;
  }

  // Transaction Methods
  async getTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((transaction) => transaction.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const newTransaction: Transaction = { 
      ...transaction, 
      id, 
      createdAt: new Date() 
    };
    
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async updateTransaction(id: number, status: string): Promise<Transaction> {
    const transaction = this.transactions.get(id);
    if (!transaction) {
      throw new Error(`Transaction with id ${id} not found`);
    }

    const updatedTransaction: Transaction = { ...transaction, status };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  // Influencer Methods
  async getInfluencerProfile(userId: number): Promise<InfluencerProfile | undefined> {
    return Array.from(this.influencerProfiles.values()).find(
      (profile) => profile.userId === userId,
    );
  }

  async getAllInfluencers(): Promise<InfluencerProfile[]> {
    return Array.from(this.influencerProfiles.values());
  }

  async getInfluencersByCategory(category: string): Promise<InfluencerProfile[]> {
    return Array.from(this.influencerProfiles.values())
      .filter((profile) => profile.category === category);
  }

  async createInfluencerProfile(profile: InsertInfluencerProfile): Promise<InfluencerProfile> {
    const id = this.currentInfluencerProfileId++;
    const newProfile: InfluencerProfile = { 
      ...profile, 
      id, 
      lastSeenAt: new Date() 
    };
    
    this.influencerProfiles.set(id, newProfile);
    return newProfile;
  }

  async updateInfluencerStatus(userId: number, isOnline: boolean): Promise<InfluencerProfile> {
    const profile = Array.from(this.influencerProfiles.values()).find(
      (profile) => profile.userId === userId,
    );

    if (!profile) {
      throw new Error(`Influencer profile for user ${userId} not found`);
    }

    const updatedProfile: InfluencerProfile = { 
      ...profile, 
      isOnline, 
      lastSeenAt: new Date() 
    };
    
    this.influencerProfiles.set(profile.id, updatedProfile);
    return updatedProfile;
  }

  async getFeaturedInfluencers(): Promise<InfluencerProfile[]> {
    // For simplicity, just return all influencers for now
    // In a real implementation, you might filter by some criteria
    return Array.from(this.influencerProfiles.values());
  }

  // Interaction Methods
  async getInteraction(id: number): Promise<Interaction | undefined> {
    return this.interactions.get(id);
  }

  async getUserInteractions(userId: number): Promise<Interaction[]> {
    return Array.from(this.interactions.values())
      .filter((interaction) => interaction.userId === userId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async getInfluencerInteractions(influencerId: number): Promise<Interaction[]> {
    return Array.from(this.interactions.values())
      .filter((interaction) => interaction.influencerId === influencerId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async createInteraction(interaction: InsertInteraction): Promise<Interaction> {
    const id = this.currentInteractionId++;
    const now = new Date();
    
    const newInteraction: Interaction = { 
      ...interaction, 
      id, 
      startedAt: now,
      endedAt: null,
      durationMinutes: 0,
      totalCost: 0
    };
    
    this.interactions.set(id, newInteraction);
    return newInteraction;
  }

  async updateInteraction(id: number, updates: Partial<Interaction>): Promise<Interaction> {
    const interaction = this.interactions.get(id);
    if (!interaction) {
      throw new Error(`Interaction with id ${id} not found`);
    }

    const updatedInteraction: Interaction = { ...interaction, ...updates };
    
    if (updates.status === 'completed' && !updates.endedAt) {
      updatedInteraction.endedAt = new Date();
    }

    if (updatedInteraction.endedAt && !updatedInteraction.durationMinutes && updatedInteraction.startedAt) {
      // Convert string dates to Date objects if needed
      const endDate = typeof updatedInteraction.endedAt === 'string' 
        ? new Date(updatedInteraction.endedAt) 
        : updatedInteraction.endedAt;
        
      const startDate = typeof updatedInteraction.startedAt === 'string'
        ? new Date(updatedInteraction.startedAt)
        : updatedInteraction.startedAt;
        
      const durationMs = endDate.getTime() - startDate.getTime();
      updatedInteraction.durationMinutes = durationMs / (1000 * 60);
    }

    this.interactions.set(id, updatedInteraction);
    return updatedInteraction;
  }

  // Chat Methods
  async getChatMessages(interactionId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter((message) => message.interactionId === interactionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentChatMessageId++;
    const newMessage: ChatMessage = { 
      ...message, 
      id, 
      createdAt: new Date() 
    };
    
    this.chatMessages.set(id, newMessage);
    return newMessage;
  }
}

export const storage = new MemStorage();
