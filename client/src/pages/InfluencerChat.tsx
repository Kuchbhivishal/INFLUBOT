import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Phone, Video, Mic, MicOff, VideoOff, PhoneOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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

const InfluencerChat = () => {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [interactionId, setInteractionId] = useState<number | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Call-related refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<number | null>(null);
  
  // Call-related states
  const [callType, setCallType] = useState<"audio" | "video" | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callCost, setCallCost] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{
    callType: "audio" | "video";
    callerId: number;
    callerName: string;
  } | null>(null);
  
  // Constants for call pricing
  const AUDIO_CALL_RATE = 100; // Cost per minute in rupees
  const VIDEO_CALL_RATE = 200; // Cost per minute in rupees
  
  // Connect to WebSocket for the influencer
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${INFLUENCER.id}`;
    
    console.log(`Connecting to WebSocket as influencer ${INFLUENCER.name} (ID: ${INFLUENCER.id})`);
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      // Authenticate
      ws.send(JSON.stringify({
        type: "auth",
        data: { userId: INFLUENCER.id }
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received message:", data);
      
      if (data.type === "chat") {
        const chatMessage = data.data;
        // Process the chat message
        if (!interactionId && chatMessage.interactionId) {
          // If we don't have an interaction ID yet but received a message, use that interaction
          setInteractionId(chatMessage.interactionId);
          fetchMessages(chatMessage.interactionId);
        }
        
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
      } else if (data.type === "call-request") {
        // Handle incoming call request
        console.log("Received call request:", data.data);
        
        // Get call information safely with fallbacks
        const callType = data.data.callType || "audio";
        const senderId = data.data.callerId || data.data.senderId;
        const senderName = data.data.callerName || data.data.senderName || `User ${senderId}`;
        const callInteractionId = data.data.interactionId;
        
        // Update interaction ID if we don't have one
        if (!interactionId && callInteractionId) {
          setInteractionId(callInteractionId);
        }
        
        setIncomingCall({
          callType,
          callerId: senderId,
          callerName: senderName
        });
        
        setIsCallDialogOpen(true);
        
        toast({
          title: "Incoming Call",
          description: `${senderName} is calling you (${callType})`
        });
      } else if (data.type === "call-accept") {
        // Handle call accepted
        setIsCallActive(true);
        setIsCallDialogOpen(false);
        
        toast({
          title: "Call Connected",
          description: `${USER.name} accepted your call`
        });
        
        // Set up call timer
        const startTime = Date.now();
        callTimerRef.current = window.setInterval(() => {
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
          setCallDuration(elapsedSeconds);
        }, 1000);
        
        // Setup WebRTC
        if (peerConnectionRef.current && localStreamRef.current) {
          // Create and send offer
          peerConnectionRef.current.createOffer().then(offer => {
            return peerConnectionRef.current!.setLocalDescription(offer);
          }).then(() => {
            // Send offer to remote peer
            if (socket?.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: "call-offer",
                data: {
                  recipientId: USER.id,
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
            if (event.candidate && socket?.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: "call-ice-candidate",
                data: {
                  recipientId: USER.id,
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
              if (socket?.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  type: "call-answer",
                  data: {
                    recipientId: incomingCall?.callerId,
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
          description: `${USER.name} declined your call`,
          variant: "destructive"
        });
      } else if (data.type === "call-busy") {
        // Handle recipient busy
        endCall();
        
        toast({
          title: "Call Failed",
          description: `${USER.name} is unavailable`,
          variant: "destructive"
        });
      } else if (data.type === "call-end") {
        // Handle call ended by recipient
        endCall();
        
        toast({
          title: "Call Ended",
          description: `${USER.name} ended the call`
        });
      } else if (data.type === "call-audio-toggle") {
        // Remote user toggled audio
        toast({
          title: `${USER.name} ${data.data.isMuted ? "muted" : "unmuted"} their audio`,
          variant: "default"
        });
      } else if (data.type === "call-video-toggle") {
        // Remote user toggled video
        toast({
          title: `${USER.name} turned their video ${data.data.isVideoOff ? "off" : "on"}`,
          variant: "default"
        });
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
      setTimeout(() => {
        setupWebSocket();
      }, 3000);
    };
    
    setSocket(ws);
    
    // Create a function to set up the WebSocket
    const setupWebSocket = () => {
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
    
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [interactionId]);
  
  // Check for existing interactions when component loads
  useEffect(() => {
    checkForExistingInteractions();
  }, []);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Check for existing interactions between the user and influencer
  const checkForExistingInteractions = async () => {
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
        title: "Chat ready",
        description: `You can now chat with ${USER.name}`,
      });
    } catch (error) {
      console.error("Error finding interaction:", error);
      toast({
        title: "Failed to find chat",
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
        senderId: INFLUENCER.id,
        content: messageContent,
        timestamp: new Date(),
        senderName: INFLUENCER.name,
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
          recipientId: USER.id,
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
      
      // Create peer connection
      const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;
      
      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });
      
      // Calculate call cost per minute based on call type
      const callCostPerMinute = type === "audio" ? AUDIO_CALL_RATE : VIDEO_CALL_RATE;
      
      // Send call request to user
      socket.send(JSON.stringify({
        type: "call-request",
        data: {
          recipientId: USER.id,
          callType: type,
          interactionId,
          callCostPerMinute
        }
      }));
      
      // Notify user
      toast({
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Call`,
        description: `Calling ${USER.name}...`,
      });
      
    } catch (error) {
      console.error("Error starting call:", error);
      setCallType(null);
      setIsCallDialogOpen(false);
      
      toast({
        title: "Call Failed",
        description: "Could not access camera/microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };
  
  const acceptCall = async () => {
    if (!socket || !incomingCall || !interactionId) return;
    
    try {
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
      
      // Create peer connection
      const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;
      
      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });
      
      // Set call state
      setCallType(incomingCall.callType);
      setIsCallActive(true);
      setIsCallDialogOpen(false);
      
      // Calculate call cost per minute based on call type
      const callCostPerMinute = incomingCall.callType === "audio" ? AUDIO_CALL_RATE : VIDEO_CALL_RATE;
      
      // Send call accept message
      socket.send(JSON.stringify({
        type: "call-accept",
        data: {
          recipientId: incomingCall.callerId,
          callType: incomingCall.callType,
          interactionId,
          callCostPerMinute
        }
      }));
      
      // Set up call timer
      const startTime = Date.now();
      callTimerRef.current = window.setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        setCallDuration(elapsedSeconds);
      }, 1000);
      
      // Setup ICE handling and handle tracks
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: "call-ice-candidate",
            data: {
              recipientId: incomingCall.callerId,
              candidate: event.candidate
            }
          }));
        }
      };
      
      peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };
      
    } catch (error) {
      console.error("Error accepting call:", error);
      rejectCall();
      
      toast({
        title: "Call Failed",
        description: "Could not access your camera/microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };
  
  const rejectCall = () => {
    if (!socket || !incomingCall) return;
    
    // Send call reject message
    socket.send(JSON.stringify({
      type: "call-reject",
      data: {
        recipientId: incomingCall.callerId,
        reason: "rejected"
      }
    }));
    
    // Reset state
    setIncomingCall(null);
    setIsCallDialogOpen(false);
    
    toast({
      title: "Call Rejected",
      description: "You declined the incoming call",
    });
  };
  
  const endCall = () => {
    if (!socket || !callType) return;
    
    // Send call end message to the other party
    socket.send(JSON.stringify({
      type: "call-end",
      data: {
        recipientId: incomingCall?.callerId || USER.id,
        reason: "ended"
      }
    }));
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Stop media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Clear timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    
    // Reset state
    setIsCallActive(false);
    setCallType(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIncomingCall(null);
    setIsCallDialogOpen(false);
    setCallDuration(0);
    setCallCost(0);
    
    toast({
      title: "Call Ended",
      description: "The call has been ended",
    });
  };
  
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    
    const audioTracks = localStreamRef.current.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = !track.enabled;
    });
    
    setIsMuted(!isMuted);
    
    // Notify other party about audio state change
    if (socket && socket.readyState === WebSocket.OPEN && callType) {
      socket.send(JSON.stringify({
        type: "call-audio-toggle",
        data: {
          recipientId: incomingCall?.callerId || USER.id,
          isMuted: !isMuted
        }
      }));
    }
  };
  
  const toggleVideo = () => {
    if (!localStreamRef.current || callType !== "video") return;
    
    const videoTracks = localStreamRef.current.getVideoTracks();
    videoTracks.forEach(track => {
      track.enabled = !track.enabled;
    });
    
    setIsVideoOff(!isVideoOff);
    
    // Notify other party about video state change
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "call-video-toggle",
        data: {
          recipientId: incomingCall?.callerId || USER.id,
          isVideoOff: !isVideoOff
        }
      }));
    }
  };
  
  const handleReconnect = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${INFLUENCER.id}`;
    
    const newWs = new WebSocket(wsUrl);
    newWs.onopen = () => {
      console.log("WebSocket reconnected");
      setIsConnected(true);
      newWs.send(JSON.stringify({
        type: "auth",
        data: { userId: INFLUENCER.id }
      }));
    };
    
    newWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received message after reconnect:", data);
      
      if (data.type === "chat") {
        const chatMessage = data.data;
        if (interactionId && chatMessage.interactionId === interactionId) {
          setMessages(prevMessages => {
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
    
    newWs.onerror = (error) => {
      console.error("WebSocket error after reconnect:", error);
      setIsConnected(false);
    };
    
    newWs.onclose = () => {
      console.log("WebSocket disconnected after reconnect");
      setIsConnected(false);
    };
    
    setSocket(newWs);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Card className="max-w-4xl mx-auto h-[80vh] flex flex-col bg-gray-50">
        <CardHeader className="px-6 py-4 flex flex-row items-center justify-between border-b space-y-0 bg-primary text-white">
          <div className="flex items-center">
            <Avatar className="h-10 w-10 mr-3 border-2 border-white">
              <AvatarImage src={INFLUENCER.avatar} alt={INFLUENCER.name} />
              <AvatarFallback>{INFLUENCER.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">Influencer Dashboard</CardTitle>
              <div className="text-sm text-primary-foreground/80">You are logged in as {INFLUENCER.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></span>
            <Button 
              variant={isConnected ? "secondary" : "destructive"} 
              size="sm" 
              onClick={handleReconnect}
            >
              {isConnected ? "Connected" : "Reconnect"}
            </Button>
            {interactionId && (
              <span className="text-xs bg-white text-primary px-2 py-1 rounded-full">
                Chat #{interactionId}
              </span>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="flex-grow p-0">
          <div className="p-4 bg-white border-b">
            <div className="flex items-center">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src={USER.avatar} alt={USER.name} />
                <AvatarFallback>{USER.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-sm">{USER.name}</h3>
                <p className="text-xs text-gray-500">Fan</p>
              </div>
            </div>
          </div>
          
          <ScrollArea className="h-[55vh] p-4 bg-white">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                No messages yet. Wait for {USER.name} to start the conversation or send a greeting!
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isFromMe = msg.senderId === INFLUENCER.id;
                  
                  return (
                    <div key={msg.id} className={`flex ${isFromMe ? "justify-end" : "justify-start"} mb-4`}>
                      {!isFromMe && (
                        <Avatar className="h-8 w-8 mr-2 mt-1">
                          <AvatarImage src={USER.avatar} alt={USER.name} />
                          <AvatarFallback>{USER.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className="flex flex-col">
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
                          <AvatarImage src={INFLUENCER.avatar} alt={INFLUENCER.name} />
                          <AvatarFallback>{INFLUENCER.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="p-4 border-t bg-white">
          <div className="w-full">
            {/* Call buttons */}
            {isConnected && interactionId && !isCallActive && (
              <div className="flex justify-center mb-3 space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => startCall("audio")}
                  disabled={!isConnected}
                  className="flex items-center gap-1"
                >
                  <Phone className="h-4 w-4" />
                  <span>Audio Call</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => startCall("video")}
                  disabled={!isConnected}
                  className="flex items-center gap-1"
                >
                  <Video className="h-4 w-4" />
                  <span>Video Call</span>
                </Button>
              </div>
            )}
            
            {/* Active call controls */}
            {isCallActive && (
              <div className="bg-gray-100 p-2 rounded-lg mb-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Badge variant="outline" className="mr-2">
                      {callType === "audio" ? "Audio Call" : "Video Call"}
                    </Badge>
                    <span className="text-sm">
                      {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      size="icon" 
                      variant={isMuted ? "destructive" : "outline"} 
                      onClick={toggleMute}
                    >
                      {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    
                    {callType === "video" && (
                      <Button 
                        size="icon" 
                        variant={isVideoOff ? "destructive" : "outline"} 
                        onClick={toggleVideo}
                      >
                        {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                      </Button>
                    )}
                    
                    <Button 
                      size="icon" 
                      variant="destructive" 
                      onClick={endCall}
                    >
                      <PhoneOff className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Message input */}
            <form onSubmit={handleSendMessage} className="flex w-full space-x-2">
              <Input
                placeholder={`Reply to ${USER.name}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-grow"
              />
              <Button type="submit" disabled={!message.trim() || !interactionId || !isConnected}>
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </CardFooter>
      </Card>
      
      {/* Call Dialog for video */}
      {callType === "video" && isCallActive && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Video Call with {USER.name}</DialogTitle>
              <DialogDescription>
                {callDuration > 0 && (
                  <div className="flex items-center justify-between">
                    <div>
                      Call time: {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge>{USER.name}</Badge>
                </div>
              </div>
              
              <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge>You</Badge>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4 mt-4">
              <Button 
                size="icon" 
                variant={isMuted ? "destructive" : "outline"} 
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              
              <Button 
                size="icon" 
                variant={isVideoOff ? "destructive" : "outline"} 
                onClick={toggleVideo}
              >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </Button>
              
              <Button 
                size="icon" 
                variant="destructive" 
                onClick={endCall}
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Audio Call Dialog */}
      {callType === "audio" && isCallActive && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Audio Call with {USER.name}</DialogTitle>
              <DialogDescription>
                {callDuration > 0 && (
                  <div className="flex items-center justify-between">
                    <div>
                      Call time: {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex justify-center items-center py-12">
              <Avatar className="h-32 w-32">
                <AvatarImage src={USER.avatar} alt={USER.name} />
                <AvatarFallback className="text-4xl">{USER.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex justify-center space-x-4">
              <Button 
                size="icon" 
                variant={isMuted ? "destructive" : "outline"} 
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              
              <Button 
                size="icon" 
                variant="destructive" 
                onClick={endCall}
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Incoming Call Dialog */}
      <Dialog open={isCallDialogOpen && !!incomingCall} onOpenChange={() => {
        if (incomingCall) rejectCall();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Incoming {incomingCall?.callType} Call</DialogTitle>
            <DialogDescription>
              {incomingCall?.callerName} is calling you
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center items-center py-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={USER.avatar} alt={USER.name} />
              <AvatarFallback className="text-3xl">{USER.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex justify-center space-x-4">
            <Button 
              variant="destructive" 
              onClick={rejectCall}
            >
              Decline
            </Button>
            
            <Button 
              variant="default" 
              onClick={acceptCall}
            >
              Accept Call
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Outgoing Call Dialog */}
      <Dialog open={isCallDialogOpen && !incomingCall && !isCallActive} onOpenChange={() => {
        if (callType && !isCallActive) endCall();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calling {USER.name}</DialogTitle>
            <DialogDescription>
              {callType && `Outgoing ${callType} call`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center items-center py-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={USER.avatar} alt={USER.name} />
              <AvatarFallback className="text-3xl">{USER.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex justify-center">
            <Button 
              variant="destructive" 
              onClick={endCall}
            >
              Cancel Call
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InfluencerChat;