import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import OtpVerificationModal from "./OtpVerificationModal";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
  const { loginWithGoogle } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const { toast } = useToast();

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      onOpenChange(false);
      toast({
        title: "Login successful",
        description: "Welcome to InfluConnect!",
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: (error as Error).message || "Failed to login with Google",
        variant: "destructive",
      });
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim() || phoneNumber.length !== 10 || !/^\d+$/.test(phoneNumber)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Send OTP API call will be implemented here
      // For now, just open the OTP verification modal
      setIsOtpModalOpen(true);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to send OTP",
        description: (error as Error).message || "Please try again later",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Login / Sign Up</DialogTitle>
            <DialogDescription>
              Connect with influencers by logging in or creating a new account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center bg-white border border-gray-300 text-dark px-4 py-3 rounded-lg hover:bg-gray-50 transition font-medium"
              onClick={handleGoogleLogin}
            >
              <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" alt="Google logo" className="w-5 h-5 mr-3" />
              Continue with Google
            </Button>
            
            <div className="flex items-center my-4">
              <Separator className="flex-grow" />
              <span className="mx-4 text-gray-500">or</span>
              <Separator className="flex-grow" />
            </div>
            
            <form onSubmit={handleSendOtp}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phoneNumber" className="block text-gray-700 mb-2 font-medium">Mobile Number</Label>
                  <div className="flex">
                    <div className="bg-gray-100 flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300">
                      <span className="text-gray-500">+91</span>
                    </div>
                    <Input 
                      id="phoneNumber"
                      type="tel" 
                      className="flex-grow border border-gray-300 px-4 py-3 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                      placeholder="Enter your mobile number"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full bg-primary text-white px-4 py-3 rounded-lg hover:bg-opacity-90 transition font-medium">
                  Send OTP
                </Button>
              </div>
            </form>
            
            <div className="mt-4 text-sm text-center text-gray-600">
              By continuing, you agree to InfluConnect's 
              <a href="#" className="text-primary hover:underline"> Terms of Service</a> and 
              <a href="#" className="text-primary hover:underline"> Privacy Policy</a>.
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <OtpVerificationModal 
        open={isOtpModalOpen} 
        onOpenChange={setIsOtpModalOpen} 
        phoneNumber={`+91 ${phoneNumber}`} 
      />
    </>
  );
};

export default AuthModal;
