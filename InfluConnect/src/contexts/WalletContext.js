import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import walletService from '../api/walletService';

const WalletContext = createContext({
  balance: 0,
  isLoading: false,
  rechargeWallet: async () => {},
  getTransactions: async () => [],
  transactions: [],
});

export const WalletProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

  // Load wallet balance when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchWalletBalance();
      fetchTransactions();
    } else {
      setBalance(0);
      setTransactions([]);
    }
  }, [user, isAuthenticated]);

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    setIsLoading(true);
    try {
      const wallet = await walletService.getWallet();
      setBalance(wallet.balance);
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const data = await walletService.getTransactions();
      setTransactions(data);
      return data;
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Recharge wallet
  const rechargeWallet = async (amount, paymentMethod) => {
    setIsLoading(true);
    try {
      const result = await walletService.rechargeWallet(amount, paymentMethod);
      await fetchWalletBalance(); // Refresh balance after recharge
      await fetchTransactions(); // Refresh transactions
      return { success: true, ...result };
    } catch (error) {
      console.error('Failed to recharge wallet:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        balance,
        isLoading,
        rechargeWallet,
        getTransactions: fetchTransactions,
        transactions,
        refreshBalance: fetchWalletBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);