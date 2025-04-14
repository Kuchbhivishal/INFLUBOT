import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";

interface WalletRechargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WalletRechargeModal = ({ open, onOpenChange }: WalletRechargeModalProps) => {
  const [amount, setAmount] = useState<number>(100);
  const [convenienceFee, setConvenienceFee] = useState<number>(50);
  const [totalAmount, setTotalAmount] = useState<number>(150);
  const { rechargeWallet } = useWallet();
  const { toast } = useToast();

  useEffect(() => {
    // Calculate convenience fee (50% of the amount for this app as per requirements)
    const fee = amount / 2;
    setConvenienceFee(fee);
    setTotalAmount(amount + fee);
  }, [amount]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setAmount(value);
    } else {
      setAmount(0);
    }
  };

  const handlePayment = async () => {
    if (amount < 100) {
      toast({
        title: "Invalid amount",
        description: "Please enter at least ₹100",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Call wallet recharge API
      await rechargeWallet(amount, convenienceFee);
      
      onOpenChange(false);
      toast({
        title: "Recharge successful",
        description: `₹${amount.toFixed(2)} added to your wallet.`,
      });
    } catch (error) {
      toast({
        title: "Recharge failed",
        description: (error as Error).message || "Please try again later",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Recharge Wallet</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div>
            <Label htmlFor="amount" className="block text-gray-700 mb-2 font-medium">Enter Amount (₹)</Label>
            <Input 
              id="amount"
              type="number" 
              min="100" 
              className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
              placeholder="Minimum ₹100"
              value={amount}
              onChange={handleAmountChange}
            />
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Summary</h3>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Amount to add</span>
              <span className="font-medium">₹{amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Convenience Fee</span>
              <span className="font-medium">₹{convenienceFee.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-300 my-2"></div>
            <div className="flex justify-between font-bold">
              <span>Total Payable</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>
          
          <Button 
            onClick={handlePayment}
            className="w-full bg-primary text-white px-4 py-3 rounded-lg hover:bg-opacity-90 transition font-medium"
          >
            Proceed to Pay ₹{totalAmount.toFixed(2)}
          </Button>
          
          <div className="text-center text-sm text-gray-600">
            By proceeding, you agree to our <a href="#" className="text-primary hover:underline">Payment Terms</a>.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletRechargeModal;
