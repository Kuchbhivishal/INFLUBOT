import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface OtpVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
}

const OtpVerificationModal = ({ open, onOpenChange, phoneNumber }: OtpVerificationModalProps) => {
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const { loginWithOtp } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (open && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    
    if (countdown === 0) {
      setCanResend(true);
    }
    
    return () => {
      clearInterval(timer);
    };
  }, [open, countdown]);

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await loginWithOtp(phoneNumber.replace("+91 ", ""), otp);
      onOpenChange(false);
      toast({
        title: "Verification successful",
        description: "Welcome to InfluConnect!",
      });
    } catch (error) {
      toast({
        title: "Verification failed",
        description: (error as Error).message || "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResendOtp = async () => {
    try {
      // Send OTP again
      // This will be implemented in the authService
      
      setCountdown(30);
      setCanResend(false);
      
      toast({
        title: "OTP sent",
        description: "A new OTP has been sent to your mobile number",
      });
    } catch (error) {
      toast({
        title: "Failed to resend OTP",
        description: (error as Error).message || "Please try again later",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Verify OTP</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-gray-600">We've sent a verification code to <span className="font-medium">{phoneNumber}</span></p>
          
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          
          <Button 
            onClick={handleVerifyOtp} 
            className="w-full bg-primary text-white px-4 py-3 rounded-lg hover:bg-opacity-90 transition font-medium"
          >
            Verify OTP
          </Button>
          
          <div className="text-center">
            <p className="text-gray-600 text-sm">Didn't receive the OTP?</p>
            {canResend ? (
              <Button 
                variant="link" 
                onClick={handleResendOtp} 
                className="text-primary font-medium hover:underline text-sm mt-1"
              >
                Resend OTP
              </Button>
            ) : (
              <p className="text-sm text-gray-500 mt-1">
                Resend OTP in {countdown} seconds
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OtpVerificationModal;
