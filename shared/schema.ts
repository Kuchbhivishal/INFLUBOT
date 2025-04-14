import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  email: text("email"),
  fullName: text("full_name"),
  profileImage: text("profile_image"),
  phoneNumber: text("phone_number"),
  isInfluencer: boolean("is_influencer").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  googleId: text("google_id"),
  lastLoginAt: timestamp("last_login_at"),
});

// Wallet Schema
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  balance: doublePrecision("balance").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transaction Schema
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: doublePrecision("amount").notNull(),
  fee: doublePrecision("fee"),
  type: text("type").notNull(), // 'deposit', 'withdrawal', 'charge'
  status: text("status").notNull(), // 'pending', 'completed', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
  metadata: json("metadata"),
});

// Influencer Profile Schema
export const influencerProfiles = pgTable("influencer_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  bio: text("bio"),
  pricePerMinute: doublePrecision("price_per_minute").notNull(),
  ratingAvg: doublePrecision("rating_avg").default(0),
  ratingCount: integer("rating_count").default(0),
  isOnline: boolean("is_online").default(false),
  lastSeenAt: timestamp("last_seen_at"),
});

// Interaction Schema
export const interactions = pgTable("interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  influencerId: integer("influencer_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'chat', 'audio_call', 'video_call'
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  durationMinutes: doublePrecision("duration_minutes"),
  totalCost: doublePrecision("total_cost"),
  status: text("status").notNull(), // 'active', 'completed', 'cancelled'
});

// Chat Messages Schema
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  interactionId: integer("interaction_id").notNull().references(() => interactions.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertInfluencerProfileSchema = createInsertSchema(influencerProfiles).omit({
  id: true,
  lastSeenAt: true,
});

export const insertInteractionSchema = createInsertSchema(interactions).omit({
  id: true,
  startedAt: true,
  endedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type InfluencerProfile = typeof influencerProfiles.$inferSelect;
export type InsertInfluencerProfile = z.infer<typeof insertInfluencerProfileSchema>;

export type Interaction = typeof interactions.$inferSelect;
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
