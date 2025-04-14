import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { walletService } from "@/services/walletService";
import { useToast } from "@/hooks/use-toast";

interface WalletContextType {
  balance: number;
  isLoading: boolean;
  rechargeWallet: (amount: number, fee: number) => Promise<void>;
  updateBalance: () => Promise<void>;
  getTransactions: () => Promise<any[]>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Fetch wallet balance when user changes
  useEffect(() => {
    if (user && isAuthenticated) {
      updateBalance();
    } else {
      setBalance(0);
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  const updateBalance = async () => {
    if (!user) return Promise.resolve();

    try {
      setIsLoading(true);
      const wallet = await walletService.getWallet(user.id);
      setBalance(wallet.balance);
      return Promise.resolve();
    } catch (error) {
      console.error("Failed to get wallet balance:", error);
      return Promise.reject(error);
    } finally {
      setIsLoading(false);
    }
  };

  const rechargeWallet = async (amount: number, fee: number) => {
    if (!user) return Promise.reject(new Error("User not authenticated"));

    try {
      setIsLoading(true);
      await walletService.rechargeWallet(user.id, amount, fee);
      await updateBalance();
      
      toast({
        title: "Recharge successful",
        description: `₹${amount.toFixed(2)} added to your wallet.`,
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error("Wallet recharge failed:", error);
      toast({
        title: "Recharge failed",
        description: (error as Error).message || "Please try again later",
        variant: "destructive",
      });
      return Promise.reject(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactions = async () => {
    if (!user) return Promise.resolve([]);

    try {
      const transactions = await walletService.getTransactions(user.id);
      return transactions;
    } catch (error) {
      console.error("Failed to get transactions:", error);
      return [];
    }
  };

  return (
    <WalletContext.Provider
      value={{
        balance,
        isLoading,
        rechargeWallet,
        updateBalance,
        getTransactions,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
