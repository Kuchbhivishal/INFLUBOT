import { apiRequest } from "@/lib/queryClient";

export const walletService = {
  // Get wallet for a user
  getWallet: async (userId: number) => {
    try {
      const response = await fetch(`/api/wallets/${userId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallet');
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching wallet:", error);
      throw error;
    }
  },
  
  // Recharge wallet
  rechargeWallet: async (userId: number, amount: number, fee: number) => {
    try {
      const response = await apiRequest("POST", "/api/wallets/recharge", {
        userId,
        amount,
        fee,
        type: 'deposit',
        status: 'completed',
        metadata: {
          paymentMethod: 'credit_card',
          timestamp: new Date().toISOString()
        }
      });
      
      return await response.json();
    } catch (error) {
      console.error("Error recharging wallet:", error);
      throw error;
    }
  },
  
  // Get transaction history
  getTransactions: async (userId: number) => {
    try {
      const response = await fetch(`/api/transactions/${userId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching transactions:", error);
      throw error;
    }
  }
};
