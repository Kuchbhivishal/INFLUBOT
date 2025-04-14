import { apiRequest } from './apiClient';

const walletService = {
  // Get user wallet information
  getWallet: async () => {
    return await apiRequest('GET', '/api/wallet');
  },

  // Get transaction history
  getTransactions: async () => {
    return await apiRequest('GET', '/api/wallet/transactions');
  },

  // Recharge wallet
  rechargeWallet: async (amount, paymentMethod) => {
    return await apiRequest('POST', '/api/wallet/recharge', {
      amount,
      paymentMethod,
    });
  },

  // Transfer funds (for payments to influencers)
  transferFunds: async (recipientId, amount, purpose) => {
    return await apiRequest('POST', '/api/wallet/transfer', {
      recipientId,
      amount,
      purpose,
    });
  },
};

export default walletService;