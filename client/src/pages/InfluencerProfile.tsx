import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfluencerProfile as InfluencerProfileType, User } from "@shared/schema";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { Star, MessageSquare, Phone, Video, Clock, Shield, Award, Clock3 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const InfluencerProfile = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { balance } = useWallet();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("about");
  const [, setLocation] = useLocation();

  // Fetch influencer data
  const { data: influencerData, isLoading } = useQuery<{
    influencer: InfluencerProfileType;
    user: User;
  }>({
    queryKey: [`/api/influencers/${id}`],
  });

  const startInteraction = async (type: 'chat' | 'audio_call' | 'video_call') => {
    if (!influencerData || !currentUser) return;
    
    if (type !== 'chat' && !influencerData.influencer.isOnline) {
      toast({
        title: "Influencer offline",
        description: "This influencer is currently offline and unavailable for calls",
        variant: "destructive",
      });
      return;
    }

    // Check if user has sufficient balance for at least 1 minute
    if (balance < influencerData.influencer.pricePerMinute) {
      toast({
        title: "Insufficient balance",
        description: "Please recharge your wallet to start a call",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a new interaction
      const response = await apiRequest("POST", "/api/interactions", {
        userId: currentUser.id,
        influencerId: parseInt(id || '0'),
        type,
        status: "active"
      });
      
      const interaction = await response.json();
      
      if (type === 'chat') {
        // Use wouter's setLocation instead of window.location for SPA routing
        setLocation(`/chat/${interaction.id}`);
      } else {
        // For calls, we'll handle this in a future implementation
        // This would typically involve WebRTC setup
        toast({
          title: "Call initiated",
          description: `${type === 'audio_call' ? 'Audio' : 'Video'} call started`,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to start interaction",
        description: (error as Error).message || "Please try again",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!influencerData) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold">Influencer not found</h2>
        <Link href="/dashboard">
          <Button className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const { influencer, user } = influencerData;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column - Profile Info */}
        <div className="lg:w-1/3">
          <Card>
            <CardContent className="p-0">
              <div className="relative">
                <img 
                  src={user.profileImage || "https://via.placeholder.com/500x500?text=No+Image"} 
                  alt={user.fullName || user.username} 
                  className="w-full h-64 object-cover"
                />
                <div className={`absolute top-4 right-4 ${influencer.isOnline ? 'bg-green-500' : 'bg-red-500'} text-white px-3 py-1 rounded-full text-sm font-medium flex items-center`}>
                  <span className="w-2 h-2 bg-white rounded-full inline-block mr-2"></span>
                  {influencer.isOnline ? 'LIVE' : 'OFFLINE'}
                </div>
              </div>
              
              <div className="p-6">
                <h1 className="text-2xl font-bold">{user.fullName || user.username}</h1>
                <p className="text-gray-500 text-sm mt-1">{influencer.category}</p>
                
                <div className="flex items-center mt-3">
                  <div className="flex items-center text-amber-400">
                    <Star className="h-5 w-5 fill-current" />
                    <span className="ml-1 font-medium">{(influencer.ratingAvg || 0).toFixed(1)}</span>
                  </div>
                  <span className="mx-2 text-gray-300">•</span>
                  <span className="text-gray-500">{influencer.ratingCount} reviews</span>
                </div>
                
                <div className="mt-6">
                  <div className="font-medium text-gray-600 mb-2">Pricing:</div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <MessageSquare className="h-5 w-5 text-primary mr-2" />
                        <span>Chat</span>
                      </div>
                      <span className="font-semibold">₹{(influencer.pricePerMinute * 0.8).toFixed(2)}/min</span>
                    </div>
                    <div className="border-t border-gray-200 my-2"></div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Phone className="h-5 w-5 text-primary mr-2" />
                        <span>Audio Call</span>
                      </div>
                      <span className="font-semibold">₹{influencer.pricePerMinute.toFixed(2)}/min</span>
                    </div>
                    <div className="border-t border-gray-200 my-2"></div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Video className="h-5 w-5 text-primary mr-2" />
                        <span>Video Call</span>
                      </div>
                      <span className="font-semibold">₹{(influencer.pricePerMinute * 1.2).toFixed(2)}/min</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mt-6">
                  <Button
                    onClick={() => startInteraction('chat')}
                    className="bg-primary text-white hover:bg-primary/90 flex items-center justify-center"
                  >
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Start Chat
                  </Button>
                  
                  <Button
                    onClick={() => startInteraction('audio_call')}
                    disabled={!influencer.isOnline}
                    className="bg-green-600 text-white hover:bg-green-700 flex items-center justify-center disabled:opacity-50"
                  >
                    <Phone className="mr-2 h-5 w-5" />
                    Audio Call
                  </Button>
                  
                  <Button
                    onClick={() => startInteraction('video_call')}
                    disabled={!influencer.isOnline}
                    className="bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center disabled:opacity-50"
                  >
                    <Video className="mr-2 h-5 w-5" />
                    Video Call
                  </Button>
                </div>

                {!influencer.isOnline && (
                  <div className="mt-4 text-sm text-gray-500 text-center">
                    <Clock3 className="inline-block mr-1 h-4 w-4" />
                    Call options are disabled when the influencer is offline
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Tabs with more info */}
        <div className="lg:w-2/3">
          <Tabs defaultValue="about" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
            </TabsList>
            
            <TabsContent value="about" className="p-6 bg-white rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">About {user.fullName || user.username}</h2>
              <div className="prose max-w-none">
                <p>{influencer.bio || "No bio provided yet."}</p>
                
                <h3 className="text-lg font-semibold mt-6 mb-3">Skills & Expertise</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {influencer.category.split(' & ').map((skill, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">
                      {skill}
                    </Badge>
                  ))}
                  <Badge variant="secondary" className="px-3 py-1 text-sm">Social Media</Badge>
                  <Badge variant="secondary" className="px-3 py-1 text-sm">Content Creation</Badge>
                </div>
                
                <h3 className="text-lg font-semibold mt-6 mb-3">Trust & Safety</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start">
                    <Shield className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium">Identity Verified</h4>
                      <p className="text-sm text-gray-500">Verified personal identity</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Award className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium">Professional</h4>
                      <p className="text-sm text-gray-500">Committed to guidelines</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
                    <div>
                      <h4 className="font-medium">Response Time</h4>
                      <p className="text-sm text-gray-500">Usually responds within 2 hours</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="reviews" className="p-6 bg-white rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">Customer Reviews</h2>
              <div className="flex items-center mb-6">
                <div className="flex items-center text-amber-400 text-2xl mr-3">
                  <Star className="h-8 w-8 fill-current" />
                  <span className="ml-2 font-bold">{(influencer.ratingAvg || 0).toFixed(1)}</span>
                </div>
                <span className="text-lg text-gray-500">Based on {influencer.ratingCount} reviews</span>
              </div>
              
              <div className="space-y-6">
                {/* Show message when no reviews */}
                <div className="text-center py-10 text-gray-500">
                  <p>No reviews yet. Be the first to leave a review!</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="availability" className="p-6 bg-white rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">Availability Schedule</h2>
              <div className="mb-4">
                <p className="text-gray-600">
                  {influencer.isOnline ? (
                    <span className="text-green-500 font-medium">Currently ONLINE and available for interactions</span>
                  ) : (
                    <span className="text-red-500 font-medium">Currently OFFLINE. You can still send messages.</span>
                  )}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Regular Hours</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Monday</span>
                      <span>10:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tuesday</span>
                      <span>10:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wednesday</span>
                      <span>10:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thursday</span>
                      <span>10:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Friday</span>
                      <span>10:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saturday</span>
                      <span>12:00 PM - 4:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sunday</span>
                      <span>Unavailable</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Average Response Time</h3>
                  <p className="text-sm text-gray-600">
                    When online: <span className="font-medium">Under 5 minutes</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    When offline: <span className="font-medium">Within 24 hours</span>
                  </p>
                  
                  <h3 className="font-medium mt-4 mb-2">Timezone</h3>
                  <p className="text-sm text-gray-600">
                    Indian Standard Time (GMT+5:30)
                  </p>
                  
                  <div className="mt-4 text-sm text-gray-500">
                    <p>
                      <i className="ri-information-line mr-1"></i>
                      Times shown are in your local timezone
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default InfluencerProfile;
