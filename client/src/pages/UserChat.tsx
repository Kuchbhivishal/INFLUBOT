import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, DollarSign, AlertTriangle, Phone, Video, Mic, MicOff, VideoOff, PhoneOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// Fixed user and influencer for this demo
const USER = { id: 5, name: "Sarah Williams", role: "user", avatar: "/avatar3.png" };
const INFLUENCER = { id: 1, name: "Emma Johnson", role: "influencer", avatar: "/avatar1.png" };

interface Message {
  id: number;
  senderId: number;
  content: string;
  timestamp: Date;
  senderName?: string;
}

const UserChat = () => {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [interactionId, setInteractionId] = useState<number | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [lastDeduction, setLastDeduction] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // WebRTC state variables
  const [isCallActive, setIsCallActive] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video" | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    callType: "audio" | "video";
    callerId: number;
    callerName: string;
    callCostPerMinute?: number;
  } | null>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callCost, setCallCost] = useState(0);
  
  // WebRTC refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<number | null>(null);
  
  // Connect to WebSocket for the user
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${USER.id}`;
    
    console.log(`Connecting to WebSocket as user ${USER.name} (ID: ${USER.id})`);
    const ws = new WebSocket(wsUrl);
    
    // Connection establishment
    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      
      // Authenticate with the WebSocket server
      ws.send(JSON.stringify({
        type: "auth",
        data: { userId: USER.id }
      }));
      
      // Start a ping interval to keep the connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000); // Send ping every 30 seconds
      
      // Clear interval on cleanup
      return () => clearInterval(pingInterval);
    };
    
    // Connection error handling
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
      toast({
        title: "Connection Error",
        description: "Failed to connect to chat server. Please try refreshing the page.",
        variant: "destructive"
      });
    };
    
    // Connection closed handling
    ws.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      setIsConnected(false);
      toast({
        title: "Connection Closed",
        description: "Chat connection lost. Please refresh the page to reconnect.",
        variant: "destructive"
      });
    };
    
    // Message handling
    ws.onmessage = (event) => {
      try {
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
          
          // Clear any previous error when a message goes through
          setError(null);
          
          // Scroll to the bottom when new messages arrive
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      } else if (data.type === "error") {
        // Show error message
        setError(data.data.message);
        toast({
          title: "Chat Error",
          description: data.data.message,
          variant: "destructive"
        });
      } else if (data.type === "wallet_update") {
        // Update wallet information
        setWalletBalance(data.data.balance);
        setLastDeduction(data.data.deduction);
        
        toast({
          title: "Payment Processed",
          description: `${data.data.deduction} rupees charged for ${data.data.reason}. New balance: ${data.data.balance} rupees.`,
          variant: "default"
        });
      } else if (data.type === "call-request") {
        // Handle incoming call request
        console.log("Received call request:", data.data);
        
        // Get call information safely with fallbacks
        const callType = data.data.callType || "audio";
        const senderId = data.data.callerId || data.data.senderId;
        const senderName = data.data.callerName || data.data.senderName || `User ${senderId}`;
        const callCostPerMinute = data.data.callCostPerMinute || 0;
        
        setIncomingCall({
          callType,
          callerId: senderId,
          callerName: senderName,
          callCostPerMinute
        });
        
        setIsCallDialogOpen(true);
        
        toast({
          title: "Incoming Call",
          description: `${senderName} is calling you (${callType})`,
        });
      } else if (data.type === "call-accept") {
        // Handle call accepted
        setIsCallActive(true);
        setIsCallDialogOpen(false);
        
        toast({
          title: "Call Connected",
          description: `${INFLUENCER.name} accepted your call`,
        });
        
        // Set up call timer
        const startTime = Date.now();
        callTimerRef.current = window.setInterval(() => {
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
          setCallDuration(elapsedSeconds);
          
          // Calculate cost
          if (data.data.callCostPerMinute) {
            const elapsedMinutes = elapsedSeconds / 60;
            const currentCost = Math.ceil(elapsedMinutes * data.data.callCostPerMinute);
            setCallCost(currentCost);
          }
        }, 1000);
        
        // Setup WebRTC
        if (peerConnectionRef.current && localStreamRef.current) {
          // Create and send offer
          peerConnectionRef.current.createOffer().then(offer => {
            return peerConnectionRef.current!.setLocalDescription(offer);
          }).then(() => {
            // Send offer to remote peer
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: "call-offer",
                data: {
                  recipientId: INFLUENCER.id,
                  offer: peerConnectionRef.current!.localDescription
                }
              }));
            }
          }).catch(error => {
            console.error("Error creating offer:", error);
            endCall();
          });
          
          // Handle ICE candidates
          peerConnectionRef.current.onicecandidate = (event) => {
            if (event.candidate && socket && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: "call-ice-candidate",
                data: {
                  recipientId: INFLUENCER.id,
                  candidate: event.candidate
                }
              }));
            }
          };
          
          // Handle incoming tracks
          peerConnectionRef.current.ontrack = (event) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0];
            }
          };
        }
      } else if (data.type === "call-offer") {
        // Handle incoming WebRTC offer
        if (peerConnectionRef.current && isCallActive) {
          const { offer } = data.data;
          
          peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer))
            .then(() => peerConnectionRef.current!.createAnswer())
            .then(answer => peerConnectionRef.current!.setLocalDescription(answer))
            .then(() => {
              // Send answer back to caller
              if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  type: "call-answer",
                  data: {
                    recipientId: INFLUENCER.id,
                    answer: peerConnectionRef.current!.localDescription
                  }
                }));
              }
            })
            .catch(error => {
              console.error("Error handling offer:", error);
              endCall();
            });
        }
      } else if (data.type === "call-answer") {
        // Handle incoming WebRTC answer
        if (peerConnectionRef.current && isCallActive) {
          const { answer } = data.data;
          peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
            .catch(error => {
              console.error("Error handling answer:", error);
              endCall();
            });
        }
      } else if (data.type === "call-ice-candidate") {
        // Handle incoming ICE candidate
        if (peerConnectionRef.current && isCallActive) {
          const { candidate } = data.data;
          try {
            peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        }
      } else if (data.type === "call-reject") {
        // Handle call rejected
        endCall();
        
        toast({
          title: "Call Rejected",
          description: `${INFLUENCER.name} declined your call`,
          variant: "destructive"
        });
      } else if (data.type === "call-busy") {
        // Handle recipient busy
        endCall();
        
        toast({
          title: "Call Failed",
          description: `${INFLUENCER.name} is unavailable`,
          variant: "destructive"
        });
      } else if (data.type === "call-end") {
        // Handle call ended by recipient
        endCall();
        
        toast({
          title: "Call Ended",
          description: `${INFLUENCER.name} ended the call`,
        });
      } else if (data.type === "call-audio-toggle") {
        // Remote user toggled audio
        toast({
          title: `${INFLUENCER.name} ${data.data.isMuted ? "muted" : "unmuted"} their audio`,
          variant: "default"
        });
      } else if (data.type === "call-video-toggle") {
        // Remote user toggled video
        toast({
          title: `${INFLUENCER.name} turned their video ${data.data.isVideoOff ? "off" : "on"}`,
          variant: "default"
        });
      }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };
    
    // Create a function to set up the WebSocket
    const setupWebSocket = () => {
      console.log("Attempting WebSocket reconnection...");
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      const newWs = new WebSocket(wsUrl);
      newWs.onopen = ws.onopen;
      newWs.onmessage = ws.onmessage;
      newWs.onerror = ws.onerror;
      newWs.onclose = ws.onclose;
      setSocket(newWs);
    };
    
    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      // Try to reconnect after a delay
      setTimeout(() => {
        setupWebSocket();
      }, 3000);
    };
    
    setSocket(ws);
    
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [interactionId]);
  
  // Create or get an interaction when the component loads
  useEffect(() => {
    setupInteraction();
  }, []);
  
  // Create or get an interaction
  const setupInteraction = async () => {
    try {
      // Get or create interaction between the user and influencer
      const response = await fetch('/api/test/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: USER.id,
          influencerId: INFLUENCER.id,
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
        description: `You are now chatting with ${INFLUENCER.name}`,
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
    
    const messageContent = message;
    
    // Send via WebSocket
    if (socket.readyState === WebSocket.OPEN) {
      // Add an optimistic update for the outgoing message
      const tempId = Date.now(); // Temporary ID until we get the real one from server
      const optimisticMessage = {
        id: tempId,
        senderId: USER.id,
        content: messageContent,
        timestamp: new Date(),
        senderName: USER.name,
        isOptimistic: true // mark as optimistic to potentially update later
      };
      
      // Add to messages state immediately
      setMessages(prevMessages => [...prevMessages, optimisticMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      // Now send the actual message
      socket.send(JSON.stringify({
        type: "chat",
        data: {
          interactionId,
          recipientId: INFLUENCER.id,
          content: messageContent
        }
      }));
      
      setMessage("");
    } else {
      toast({
        title: "WebSocket not connected",
        description: "Please try again in a moment",
        variant: "destructive",
      });
    }
  };
  
  // WebRTC Functions
  const startCall = async (type: "audio" | "video") => {
    if (!socket || !interactionId) {
      toast({
        title: "Cannot start call",
        description: "Please ensure you are connected to the chat",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Set call state
      setCallType(type);
      setIsCallDialogOpen(true);
      
      // Get user media based on call type
      const mediaConstraints = {
        audio: true,
        video: type === "video"
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      localStreamRef.current = stream;
      
      // Display local video if it's a video call
      if (type === "video" && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Initialize WebRTC peer connection
      const configuration = { 
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ] 
      };
      
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;
      
      // Add local media tracks to the connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current!.addTrack(track, stream);
      });
      
      // Send call request to the influencer
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "call-request",
          data: {
            recipientId: INFLUENCER.id,
            callerId: USER.id,
            callerName: USER.name,
            callType: type,
          }
        }));
        
        toast({
          title: "Calling...",
          description: `Waiting for ${INFLUENCER.name} to accept`,
        });
      }
    } catch (error) {
      console.error("Error starting call:", error);
      toast({
        title: "Call Failed",
        description: "Could not access camera or microphone",
        variant: "destructive"
      });
      setIsCallDialogOpen(false);
    }
  };
  
  const acceptCall = async () => {
    if (!socket || !incomingCall) return;
    
    try {
      // Set call state
      setCallType(incomingCall.callType);
      setIsCallActive(true);
      
      // Get user media based on call type
      const mediaConstraints = {
        audio: true,
        video: incomingCall.callType === "video"
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      localStreamRef.current = stream;
      
      // Display local video if it's a video call
      if (incomingCall.callType === "video" && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Initialize WebRTC peer connection
      const configuration = { 
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ] 
      };
      
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;
      
      // Add local media tracks to the connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current!.addTrack(track, stream);
      });
      
      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: "call-ice-candidate",
            data: {
              recipientId: incomingCall.callerId,
              candidate: event.candidate
            }
          }));
        }
      };
      
      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };
      
      // Send acceptance message
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "call-accept",
          data: {
            recipientId: incomingCall.callerId,
            callCostPerMinute: incomingCall.callCostPerMinute
          }
        }));
      }
      
      // Set up call timer
      const startTime = Date.now();
      callTimerRef.current = window.setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        setCallDuration(elapsedSeconds);
        
        // Calculate cost if applicable
        if (incomingCall.callCostPerMinute) {
          const elapsedMinutes = elapsedSeconds / 60;
          const currentCost = Math.ceil(elapsedMinutes * incomingCall.callCostPerMinute);
          setCallCost(currentCost);
        }
      }, 1000);
      
      // Close the call dialog
      setIsCallDialogOpen(false);
    } catch (error) {
      console.error("Error accepting call:", error);
      rejectCall();
      
      toast({
        title: "Call Failed",
        description: "Could not access camera or microphone",
        variant: "destructive"
      });
    }
  };
  
  const rejectCall = () => {
    if (!socket || !incomingCall) return;
    
    // Send rejection message
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "call-reject",
        data: {
          recipientId: incomingCall.callerId
        }
      }));
    }
    
    // Reset incoming call state
    setIncomingCall(null);
    setIsCallDialogOpen(false);
  };
  
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      
      for (const track of audioTracks) {
        track.enabled = !track.enabled;
      }
      
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      
      // Notify remote peer about mute status
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "call-audio-toggle",
          data: {
            recipientId: INFLUENCER.id,
            isMuted: newMutedState
          }
        }));
      }
    }
  };
  
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      
      for (const track of videoTracks) {
        track.enabled = !track.enabled;
      }
      
      const newVideoOffState = !isVideoOff;
      setIsVideoOff(newVideoOffState);
      
      // Notify remote peer about video status
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "call-video-toggle",
          data: {
            recipientId: INFLUENCER.id,
            isVideoOff: newVideoOffState
          }
        }));
      }
    }
  };
  
  const endCall = () => {
    // Send end call message if we're the one ending it
    if (socket && socket.readyState === WebSocket.OPEN && isCallActive) {
      socket.send(JSON.stringify({
        type: "call-end",
        data: {
          recipientId: INFLUENCER.id
        }
      }));
    }
    
    // Stop media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }
    
    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Clear call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    
    // Reset call state
    setCallType(null);
    setIsCallActive(false);
    setIsCallDialogOpen(false);
    setIncomingCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
    setCallCost(0);
  };
  
  // Format time from seconds to MM:SS
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between py-2">
          <div className="flex items-center">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage src={INFLUENCER.avatar} />
              <AvatarFallback>{INFLUENCER.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{INFLUENCER.name}</CardTitle>
              <div className="text-xs text-muted-foreground flex items-center space-x-1">
                <Badge variant={isConnected ? "default" : "outline"}>
                  {isConnected ? "Online" : "Connecting..."}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => startCall("audio")}
              disabled={!isConnected || isCallActive}
            >
              <Phone className="h-4 w-4 mr-1" />
              Call
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => startCall("video")}
              disabled={!isConnected || isCallActive}
            >
              <Video className="h-4 w-4 mr-1" />
              Video
            </Button>
          </div>
        </CardHeader>
      </Card>
      
      {/* Display active call UI */}
      {isCallActive && (
        <Card className="mb-4 border-primary">
          <CardHeader className="py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CardTitle className="text-lg">
                  {callType === "audio" ? "Audio Call" : "Video Call"} with {INFLUENCER.name}
                </CardTitle>
                <Badge className="ml-2">{formatTime(callDuration)}</Badge>
              </div>
              {callCost > 0 && (
                <Badge variant="outline" className="ml-2">
                  <DollarSign className="h-3 w-3 mr-1" />
                  {callCost} Rs
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            {callType === "video" && (
              <div className="relative">
                <div className="grid grid-cols-1 gap-4">
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 right-2 w-1/4 aspect-video bg-black rounded-lg overflow-hidden border-2 border-primary">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover mirror-mode"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {callType === "audio" && (
              <div className="flex items-center justify-center py-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={INFLUENCER.avatar} />
                  <AvatarFallback className="text-3xl">{INFLUENCER.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
            )}
            <div className="flex items-center justify-center space-x-4 mt-4">
              <Button
                size="icon"
                variant={isMuted ? "destructive" : "outline"}
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              {callType === "video" && (
                <Button
                  size="icon"
                  variant={isVideoOff ? "destructive" : "outline"}
                  onClick={toggleVideo}
                >
                  {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>
              )}
              <Button
                size="icon"
                variant="destructive"
                onClick={endCall}
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="h-[calc(100vh-12rem)]">
        <CardContent className="p-0 flex flex-col h-full">
          {/* Chat messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === USER.id ? "justify-end" : "justify-start"}`}
                  >
                    <div className="flex items-start max-w-[75%]">
                      {msg.senderId !== USER.id && (
                        <Avatar className="h-8 w-8 mr-2 mt-1">
                          <AvatarImage src={INFLUENCER.avatar} />
                          <AvatarFallback>{INFLUENCER.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <div 
                          className={`rounded-lg p-3 ${
                            msg.senderId === USER.id 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
          
          {/* Cost warning */}
          {lastDeduction && (
            <Alert variant="default" className="m-4 mb-0">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Message sent!</AlertTitle>
              <AlertDescription>
                You were charged {lastDeduction} rupees. Current wallet balance: {walletBalance} rupees.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Error message */}
          {error && (
            <Alert variant="destructive" className="m-4 mb-0">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Message input */}
          <CardFooter className="p-4 pt-2">
            <form onSubmit={handleSendMessage} className="flex space-x-2 w-full">
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={!isConnected}
                className="flex-1"
              />
              <Button 
                type="submit"
                disabled={!message.trim() || !isConnected}
              >
                <Send className="h-4 w-4 mr-1" />
                Send
              </Button>
            </form>
          </CardFooter>
        </CardContent>
      </Card>
      
      {/* Incoming call dialog */}
      <Dialog open={isCallDialogOpen && !isCallActive && incomingCall !== null} onOpenChange={setIsCallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Incoming {incomingCall?.callType} Call</DialogTitle>
            <DialogDescription>
              {incomingCall?.callerName} is calling you
              {incomingCall?.callCostPerMinute ? ` (${incomingCall.callCostPerMinute} Rs/min)` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={INFLUENCER.avatar} />
              <AvatarFallback>{incomingCall?.callerName.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
          <DialogFooter className="sm:justify-center gap-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={rejectCall}
            >
              Decline
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={acceptCall}
            >
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Outgoing call dialog */}
      <Dialog open={isCallDialogOpen && !isCallActive && incomingCall === null} onOpenChange={setIsCallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calling {INFLUENCER.name}...</DialogTitle>
            <DialogDescription>
              Waiting for {INFLUENCER.name} to answer
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={INFLUENCER.avatar} />
              <AvatarFallback>{INFLUENCER.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
          <DialogFooter className="justify-center">
            <Button
              variant="destructive"
              onClick={endCall}
            >
              End Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Add CSS for mirroring local video
const style = document.createElement('style');
style.textContent = `
  .mirror-mode {
    transform: scaleX(-1);
  }
`;
document.head.appendChild(style);

export default UserChat;