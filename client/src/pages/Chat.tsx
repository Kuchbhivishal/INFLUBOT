import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { useSocket } from "@/contexts/SocketContext";
import { apiRequest } from "@/lib/queryClient";
import { ChatMessage, Interaction, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Video, Phone, Clock, AlertTriangle } from "lucide-react";

const Chat = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { balance, updateBalance } = useWallet();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<(ChatMessage & { senderName?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timer, setTimer] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [lowBalanceWarning, setLowBalanceWarning] = useState(false);

  // Fetch interaction details
  const { data: interactionData } = useQuery<{
    interaction: Interaction;
    influencer: User;
  }>({
    queryKey: [`/api/interactions/${id}`],
    // This is a workaround for TypeScript error with onSuccess
    // @ts-ignore
    onSuccess: (data: any) => {
      fetchMessages();
      
      // Start the timer for billing if interaction is active
      if (data.interaction.status === 'active') {
        startTimer();
      }
    }
  });

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/interactions/${id}/messages`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data);
      setIsLoading(false);

      // Scroll to the bottom when messages load
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (socket && user && id) {
      // Message handler function
      const handleMessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'chat' && data.data.interactionId === parseInt(id)) {
          // Check if message already exists to avoid duplicates
          setMessages(prevMessages => {
            const messageExists = prevMessages.some(msg => msg.id === data.data.id);
            if (messageExists) return prevMessages;
            return [...prevMessages, data.data];
          });
          scrollToBottom();
        }
      };
      
      // Add event listener
      socket.addEventListener('message', handleMessage);

      return () => {
        // Remove event listener
        socket.removeEventListener('message', handleMessage);
        
        // Clean up socket listeners and stop timer when component unmounts
        if (timerInterval) {
          clearInterval(timerInterval);
        }
        
        // Mark interaction as completed when leaving if it was active
        if (interactionData?.interaction.status === 'active') {
          apiRequest("PATCH", `/api/interactions/${id}`, {
            status: 'completed',
            endedAt: new Date().toISOString()
          });
        }
      };
    }
  }, [socket, user, id, timerInterval, interactionData]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check balance periodically
  useEffect(() => {
    // Show warning when balance is low (less than 2 minutes worth)
    if (interactionData && balance < interactionData.interaction.totalCost * 2) {
      setLowBalanceWarning(true);
    } else {
      setLowBalanceWarning(false);
    }

    // End call automatically if balance reaches zero
    if (interactionData && balance <= 0 && timerInterval) {
      endInteraction();
      toast({
        title: "Interaction ended",
        description: "Your wallet balance is insufficient to continue",
        variant: "destructive",
      });
    }
  }, [balance, interactionData, timerInterval]);

  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  };

  const startTimer = () => {
    if (timerInterval) return;
    
    const interval = setInterval(() => {
      setTimer(prev => {
        const newTime = prev + 1;
        
        // Every minute, charge the user's wallet
        if (newTime % 60 === 0 && interactionData) {
          chargeWallet();
        }
        
        return newTime;
      });
    }, 1000);
    
    setTimerInterval(interval);
  };

  const chargeWallet = async () => {
    if (!interactionData || !user) return;
    
    try {
      // Calculate the cost for 1 minute
      const minuteCost = interactionData.interaction.type === 'chat' 
        ? interactionData.interaction.totalCost * 0.8  // 20% discount for chat
        : interactionData.interaction.totalCost;
      
      // Charge wallet
      await apiRequest("POST", `/api/wallets/recharge`, {
        userId: user.id,
        amount: minuteCost,
        type: 'charge',
        interactionId: parseInt(id)
      });
      
      // Update balance
      updateBalance();
    } catch (error) {
      console.error('Error charging wallet:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !user || !interactionData) return;
    
    try {
      const messageText = message.trim();
      
      // Clear input immediately for better UX
      setMessage("");
      
      // Send message via socket - we only need to send via WebSocket now
      // The server will save to DB and broadcast to all participants
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'chat',
          data: {
            interactionId: parseInt(id || '0'),
            recipientId: interactionData.influencer.id,
            content: messageText
          }
        }));
      } else {
        // If socket isn't connected, send directly via API
        const response = await apiRequest("POST", `/api/interactions/${id}/messages`, {
          interactionId: parseInt(id || '0'),
          senderId: user.id,
          content: messageText
        });
        
        const newMessage = await response.json();
        
        // Add message to local state
        setMessages(prevMessages => [...prevMessages, {
          ...newMessage,
          senderName: user.fullName || user.username
        }]);
      }
      
      // Start the timer/billing if this is the first message
      if (!timerInterval && interactionData.interaction.status === 'active') {
        startTimer();
      }
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: (error as Error).message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const endInteraction = async () => {
    if (!id) return;
    
    try {
      // Stop the timer
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      
      // Update interaction status
      await apiRequest("PATCH", `/api/interactions/${id}`, {
        status: 'completed',
        endedAt: new Date().toISOString(),
        durationMinutes: timer / 60,
      });
      
      toast({
        title: "Interaction ended",
        description: `Duration: ${formatTime(timer)}. Thank you for using InfluConnect!`,
      });
    } catch (error) {
      toast({
        title: "Failed to end interaction",
        description: (error as Error).message || "Please try again",
        variant: "destructive",
      });
    }
  };

  if (!interactionData) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { interaction, influencer } = interactionData;
  const isInfluencerOnline = true; // This would normally come from the socket or API

  return (
    <div className="container mx-auto px-4 py-6">
      <Card className="max-w-4xl mx-auto h-[80vh] flex flex-col">
        <CardHeader className="px-6 py-4 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage src={influencer.profileImage || undefined} alt={influencer.fullName || influencer.username} />
              <AvatarFallback>{(influencer.fullName || influencer.username).charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{influencer.fullName || influencer.username}</CardTitle>
              <div className="flex items-center text-sm">
                <span className={`w-2 h-2 rounded-full mr-1 ${isInfluencerOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-gray-500">{isInfluencerOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {timerInterval && (
              <div className="flex items-center mr-4 bg-gray-100 px-3 py-1 rounded-full">
                <Clock className="h-4 w-4 text-gray-500 mr-1" />
                <span className="text-sm font-medium">{formatTime(timer)}</span>
              </div>
            )}
            
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-primary hover:text-primary hover:bg-primary/10"
              disabled={!isInfluencerOnline}
            >
              <Phone className="h-5 w-5" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-primary hover:text-primary hover:bg-primary/10"
              disabled={!isInfluencerOnline}
            >
              <Video className="h-5 w-5" />
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={endInteraction}
            >
              End
            </Button>
          </div>
        </CardHeader>
        
        <Separator />
        
        {lowBalanceWarning && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mx-6 my-2">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
              <p className="text-sm text-amber-700">
                Low balance warning: Less than 2 minutes remaining. Please recharge your wallet to continue.
              </p>
            </div>
          </div>
        )}
        
        <CardContent className="flex-grow overflow-y-auto p-6" ref={messageContainerRef}>
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <p className="mb-2">No messages yet.</p>
              <p className="text-sm">Start the conversation with {influencer.fullName || influencer.username}!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isFromMe = msg.senderId === user?.id;
                // Handle date safely for different formats
                const displayTime = msg.createdAt 
                  ? (msg.createdAt instanceof Date 
                      ? msg.createdAt.toLocaleTimeString() 
                      : new Date(msg.createdAt).toLocaleTimeString())
                  : '';
                const senderName = msg.senderName || (isFromMe ? (user?.fullName || user?.username) : (influencer.fullName || influencer.username));
                
                return (
                  <div 
                    key={msg.id} 
                    className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} mb-4`}
                  >
                    {!isFromMe && (
                      <Avatar className="h-8 w-8 mr-2 mt-1">
                        <AvatarImage 
                          src={influencer.profileImage || undefined} 
                          alt={influencer.fullName || influencer.username}
                        />
                        <AvatarFallback>{(influencer.fullName || influencer.username).charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className="flex flex-col">
                      {!isFromMe && (
                        <span className="text-xs text-gray-500 mb-1 ml-1">{senderName}</span>
                      )}
                      <div 
                        className={`max-w-[75%] px-4 py-2 rounded-lg ${
                          isFromMe 
                            ? 'bg-primary text-white rounded-br-none' 
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${isFromMe ? 'text-primary-foreground/70' : 'text-gray-500'}`}>
                          {displayTime}
                        </p>
                      </div>
                    </div>
                    
                    {isFromMe && (
                      <Avatar className="h-8 w-8 ml-2 mt-1">
                        <AvatarImage 
                          src={user?.profileImage || undefined} 
                          alt={user?.fullName || user?.username || "You"} 
                        />
                        <AvatarFallback>{(user?.fullName || user?.username || "You").charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="p-4 border-t bg-gray-50">
          <form onSubmit={handleSendMessage} className="flex w-full space-x-2">
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-grow"
            />
            <Button type="submit" disabled={!message.trim()}>
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Chat;
