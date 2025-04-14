import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Sample users for testing
const USERS = [
  { id: 1, name: "Emma Johnson", role: "influencer", avatar: "/avatar1.png" },
  { id: 2, name: "James Smith", role: "influencer", avatar: "/avatar2.png" },
  { id: 5, name: "Sarah Williams", role: "user", avatar: "/avatar3.png" },
  { id: 6, name: "Michael Brown", role: "user", avatar: "/avatar4.png" }
];

interface Message {
  id: number;
  senderId: number;
  content: string;
  timestamp: Date;
  senderName?: string;
}

const StandaloneChatTest = () => {
  const { toast } = useToast();
  const [activeUser, setActiveUser] = useState(USERS[0]);
  const [activeRecipient, setActiveRecipient] = useState(USERS[2]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [interactionId, setInteractionId] = useState<number | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${activeUser.id}`;
    
    console.log(`Connecting to WebSocket as user ${activeUser.id} (${activeUser.name})`);
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      // Authenticate
      ws.send(JSON.stringify({
        type: "auth",
        data: { userId: activeUser.id }
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received message:", data);
      
      if (data.type === "chat") {
        const chatMessage = data.data;
        // Only show messages for the current interaction
        if (interactionId && chatMessage.interactionId === interactionId) {
          setMessages(prevMessages => {
            // Check if message already exists
            const exists = prevMessages.some(m => m.id === chatMessage.id);
            if (exists) return prevMessages;
            
            return [...prevMessages, {
              id: chatMessage.id,
              senderId: chatMessage.senderId,
              content: chatMessage.content,
              timestamp: new Date(chatMessage.createdAt),
              senderName: chatMessage.senderName
            }];
          });
        }
      }
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };
    
    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      // Try to reconnect after a delay
      setTimeout(() => connectWebSocket(), 3000);
    };
    
    setSocket(ws);
    
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [activeUser.id, activeUser.name, interactionId]);
  
  // Connect WebSocket when active user changes
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [activeUser.id, connectWebSocket, socket]);
  
  // Create or get an interaction
  const setupInteraction = async () => {
    try {
      // Get or create interaction between these users using the test endpoint
      const response = await fetch('/api/test/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: activeUser.role === "user" ? activeUser.id : activeRecipient.id,
          influencerId: activeUser.role === "influencer" ? activeUser.id : activeRecipient.id,
          type: "chat", 
          totalCost: 10 // dummy cost
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setInteractionId(data.id);
      
      // Load previous messages
      fetchMessages(data.id);
      
      toast({
        title: "Chat started",
        description: `Interaction #${data.id} between ${activeUser.name} and ${activeRecipient.name}`,
      });
    } catch (error) {
      console.error("Error creating interaction:", error);
      toast({
        title: "Failed to start chat",
        description: (error as Error).message || "Please try again",
        variant: "destructive",
      });
    }
  };
  
  const fetchMessages = async (id: number) => {
    try {
      const response = await fetch(`/api/interactions/${id}/messages`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      
      // Convert to our message format
      const formattedMessages = data.map((msg: any) => ({
        id: msg.id,
        senderId: msg.senderId,
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        senderName: msg.senderName
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !socket || !interactionId) return;
    
    // Determine recipient
    const recipientId = activeUser.id === activeRecipient.id 
      ? (activeUser.role === "user" ? USERS.find(u => u.role === "influencer")?.id : USERS.find(u => u.role === "user")?.id)
      : activeRecipient.id;
    
    if (!recipientId) {
      toast({
        title: "Cannot send message",
        description: "No recipient selected",
        variant: "destructive",
      });
      return;
    }
    
    // Send via WebSocket
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "chat",
        data: {
          interactionId,
          recipientId,
          content: message
        }
      }));
      
      setMessage("");
    } else {
      toast({
        title: "WebSocket not connected",
        description: "Please try again in a moment",
        variant: "destructive",
      });
      // Try to reconnect
      connectWebSocket();
    }
  };
  
  const switchUser = (userId: string) => {
    const user = USERS.find(u => u.id === parseInt(userId));
    if (user) {
      setActiveUser(user);
      // Set a default recipient
      if (user.role === "user") {
        setActiveRecipient(USERS.find(u => u.role === "influencer") || USERS[0]);
      } else {
        setActiveRecipient(USERS.find(u => u.role === "user") || USERS[2]);
      }
      // Clear messages and interaction for new user
      setMessages([]);
      setInteractionId(null);
      
      // Close existing connection
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    }
  };
  
  const switchRecipient = (userId: string) => {
    const user = USERS.find(u => u.id === parseInt(userId));
    if (user) {
      setActiveRecipient(user);
      // Clear messages and interaction for new recipient
      setMessages([]);
      setInteractionId(null);
    }
  };
  
  // Manually reconnect WebSocket
  const handleReconnect = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    connectWebSocket();
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">Chat Test Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Your Account</h3>
              <Select value={activeUser.id.toString()} onValueChange={switchUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select active user" />
                </SelectTrigger>
                <SelectContent>
                  {USERS.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Chat With</h3>
              <Select value={activeRecipient.id.toString()} onValueChange={switchRecipient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {USERS.filter(u => u.id !== activeUser.id).map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {!interactionId && (
              <Button onClick={setupInteraction} className="w-full">
                Start New Chat
              </Button>
            )}
            
            <Button 
              variant={isConnected ? "outline" : "destructive"} 
              onClick={handleReconnect}
              className="whitespace-nowrap"
            >
              {isConnected ? "Connected ✓" : "Reconnect WebSocket"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {interactionId && (
        <Tabs defaultValue="conversation" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="conversation">Conversation</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>
          
          <TabsContent value="conversation">
            <Card className="max-w-4xl mx-auto h-[60vh] flex flex-col">
              <CardHeader className="px-6 py-4 flex flex-row items-center justify-between border-b space-y-0">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={activeRecipient.avatar} alt={activeRecipient.name} />
                    <AvatarFallback>{activeRecipient.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{activeRecipient.name}</CardTitle>
                    <div className="text-sm text-gray-500">{activeRecipient.role}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
                    Interaction #{interactionId}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="flex-grow p-0">
                <ScrollArea className="h-[45vh] p-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isFromMe = msg.senderId === activeUser.id;
                        const sender = USERS.find(u => u.id === msg.senderId) || 
                          { name: msg.senderName || "Unknown", avatar: "" };
                        
                        return (
                          <div key={msg.id} className={`flex ${isFromMe ? "justify-end" : "justify-start"} mb-4`}>
                            {!isFromMe && (
                              <Avatar className="h-8 w-8 mr-2 mt-1">
                                <AvatarImage src={sender.avatar} alt={sender.name} />
                                <AvatarFallback>{sender.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            )}
                            
                            <div className="flex flex-col">
                              {!isFromMe && (
                                <span className="text-xs text-gray-500 mb-1 ml-1">{sender.name}</span>
                              )}
                              <div 
                                className={`max-w-[75%] px-4 py-2 rounded-lg ${
                                  isFromMe 
                                    ? "bg-primary text-white rounded-br-none" 
                                    : "bg-gray-100 text-gray-800 rounded-bl-none"
                                }`}
                              >
                                <p>{msg.content}</p>
                                <p className={`text-xs mt-1 ${isFromMe ? "text-primary-foreground/70" : "text-gray-500"}`}>
                                  {msg.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                            
                            {isFromMe && (
                              <Avatar className="h-8 w-8 ml-2 mt-1">
                                <AvatarImage src={activeUser.avatar} alt={activeUser.name} />
                                <AvatarFallback>{activeUser.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
              
              <CardFooter className="p-4 border-t bg-gray-50">
                <form onSubmit={handleSendMessage} className="flex w-full space-x-2">
                  <Input
                    placeholder={`Message ${activeRecipient.name}...`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-grow"
                  />
                  <Button type="submit" disabled={!message.trim() || !interactionId || !isConnected}>
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="debug">
            <Card>
              <CardHeader>
                <CardTitle>Debug Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="font-medium">Active User</div>
                    <div className="text-sm">ID: {activeUser.id}</div>
                    <div className="text-sm">Name: {activeUser.name}</div>
                    <div className="text-sm">Role: {activeUser.role}</div>
                  </div>
                  <div>
                    <div className="font-medium">Chat With</div>
                    <div className="text-sm">ID: {activeRecipient.id}</div>
                    <div className="text-sm">Name: {activeRecipient.name}</div>
                    <div className="text-sm">Role: {activeRecipient.role}</div>
                  </div>
                </div>
                <Separator />
                <div>
                  <div className="font-medium">Connection Status</div>
                  <div className="text-sm">WebSocket: {isConnected ? "Connected" : "Disconnected"}</div>
                  <div className="text-sm">WebSocket State: {socket ? 
                    socket.readyState === WebSocket.CONNECTING ? "Connecting" :
                    socket.readyState === WebSocket.OPEN ? "Open" :
                    socket.readyState === WebSocket.CLOSING ? "Closing" :
                    socket.readyState === WebSocket.CLOSED ? "Closed" : "Unknown"
                    : "No Socket"}</div>
                  <div className="text-sm">Interaction ID: {interactionId || "None"}</div>
                </div>
                <Separator />
                <div>
                  <div className="font-medium">Message Count</div>
                  <div className="text-sm">{messages.length} messages in this conversation</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default StandaloneChatTest;