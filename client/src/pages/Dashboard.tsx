import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfluencerProfile, User } from "@shared/schema";
import InfluencerCard from "@/components/influencers/InfluencerCard";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Fetch all influencers
  const { data: influencerData, isLoading } = useQuery<{
    influencers: InfluencerProfile[];
    users: Record<number, User>;
  }>({
    queryKey: ['/api/influencers'],
  });

  // Filter influencers by category and search query
  const filteredInfluencers = influencerData?.influencers.filter(influencer => {
    const influencerUser = influencerData.users[influencer.userId];
    
    const matchesCategory = activeCategory === "all" || influencer.category.toLowerCase().includes(activeCategory.toLowerCase());
    
    const matchesSearch = 
      !searchQuery || 
      influencerUser.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      influencerUser.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      influencer.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Filter online influencers
  const onlineInfluencers = filteredInfluencers?.filter(influencer => influencer.isOnline);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already handled with the filter function
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Browse Influencers</h1>
        <form onSubmit={handleSearch} className="relative w-full max-w-sm">
          <Input
            type="text"
            placeholder="Search influencers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <i className="ri-search-line absolute left-3 top-2.5 text-gray-400"></i>
        </form>
      </div>

      <Tabs defaultValue="all" className="mb-8">
        <TabsList className="grid grid-cols-6 mb-4">
          <TabsTrigger value="all" onClick={() => setActiveCategory("all")}>All</TabsTrigger>
          <TabsTrigger value="gaming" onClick={() => setActiveCategory("gaming")}>Gaming</TabsTrigger>
          <TabsTrigger value="fashion" onClick={() => setActiveCategory("fashion")}>Fashion</TabsTrigger>
          <TabsTrigger value="fitness" onClick={() => setActiveCategory("fitness")}>Fitness</TabsTrigger>
          <TabsTrigger value="tech" onClick={() => setActiveCategory("tech")}>Tech</TabsTrigger>
          <TabsTrigger value="food" onClick={() => setActiveCategory("food")}>Food</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading influencers...</span>
        </div>
      ) : (
        <>
          {onlineInfluencers && onlineInfluencers.length > 0 && (
            <div className="mb-10">
              <h2 className="text-2xl font-bold mb-4">Live Now</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {onlineInfluencers.map(influencer => (
                  <InfluencerCard 
                    key={influencer.id} 
                    influencer={influencer} 
                    userData={influencerData.users[influencer.userId]} 
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold mb-4">All Influencers</h2>
            {filteredInfluencers && filteredInfluencers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredInfluencers.map(influencer => (
                  <InfluencerCard 
                    key={influencer.id} 
                    influencer={influencer} 
                    userData={influencerData.users[influencer.userId]} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No influencers found matching your criteria.</p>
                <Button 
                  variant="link" 
                  className="text-primary mt-2"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
