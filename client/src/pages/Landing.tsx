import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import InfluencerCard from "@/components/influencers/InfluencerCard";
import AuthModal from "@/components/auth/AuthModal";
import { InfluencerProfile, User } from "@shared/schema";
import { Star } from "lucide-react";

const Landing = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  // Fetch featured influencers
  const { data: featuredInfluencers, isLoading: isLoadingInfluencers } = useQuery<{
    influencers: InfluencerProfile[];
    users: Record<number, User>;
  }>({
    queryKey: ['/api/influencers/featured'],
  });

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 to-accent/5 py-12 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-black mb-4 text-dark leading-tight">
                Connect directly with your <span className="text-primary">favorite influencers</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-8">
                Chat, call, and video conference with influencers from around the world. Get personalized interactions with the creators you love.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {isAuthenticated ? (
                  <Link href="/dashboard">
                    <Button 
                      className="bg-primary text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-opacity-90 transition shadow-lg shadow-primary/20 flex items-center justify-center"
                    >
                      <i className="ri-compass-line mr-2"></i>
                      Explore Influencers
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    className="bg-primary text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-opacity-90 transition shadow-lg shadow-primary/20 flex items-center justify-center"
                    onClick={() => setIsAuthModalOpen(true)}
                  >
                    <i className="ri-user-add-line mr-2"></i>
                    Get Started
                  </Button>
                )}
                <Button variant="outline" className="border border-primary text-primary px-6 py-3 rounded-lg text-lg font-semibold hover:bg-primary/5 transition flex items-center justify-center">
                  <i className="ri-information-line mr-2"></i>
                  Learn More
                </Button>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <img 
                src="https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80" 
                alt="Influencers connecting with fans" 
                className="rounded-lg shadow-xl max-w-full md:max-w-md"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Influencers Preview */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Featured Influencers</h2>
            <Link href="/dashboard">
              <Button variant="link" className="text-primary font-medium hover:underline flex items-center">
                View All <i className="ri-arrow-right-line ml-1"></i>
              </Button>
            </Link>
          </div>
          
          {isLoadingInfluencers ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-96"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredInfluencers?.influencers.map((influencer) => (
                <InfluencerCard 
                  key={influencer.id} 
                  influencer={influencer} 
                  userData={featuredInfluencers.users[influencer.userId]} 
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-user-add-line text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold mb-2">1. Create an Account</h3>
              <p className="text-gray-600">Sign up using your Google account or mobile number and set up your profile.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-wallet-3-line text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold mb-2">2. Fund Your Wallet</h3>
              <p className="text-gray-600">Add money to your wallet using your preferred payment method to start interacting.</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md text-center">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-chat-3-line text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold mb-2">3. Connect & Interact</h3>
              <p className="text-gray-600">Chat, call, or video conference with your favorite influencers in real-time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">Explore by Category</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-primary/5 hover:bg-primary/10 rounded-lg p-4 text-center cursor-pointer transition">
              <div className="text-primary text-2xl mb-2">
                <i className="ri-game-line"></i>
              </div>
              <span className="font-medium">Gaming</span>
            </div>
            
            <div className="bg-primary/5 hover:bg-primary/10 rounded-lg p-4 text-center cursor-pointer transition">
              <div className="text-primary text-2xl mb-2">
                <i className="ri-movie-line"></i>
              </div>
              <span className="font-medium">Entertainment</span>
            </div>
            
            <div className="bg-primary/5 hover:bg-primary/10 rounded-lg p-4 text-center cursor-pointer transition">
              <div className="text-primary text-2xl mb-2">
                <i className="ri-heart-pulse-line"></i>
              </div>
              <span className="font-medium">Fitness</span>
            </div>
            
            <div className="bg-primary/5 hover:bg-primary/10 rounded-lg p-4 text-center cursor-pointer transition">
              <div className="text-primary text-2xl mb-2">
                <i className="ri-t-shirt-line"></i>
              </div>
              <span className="font-medium">Fashion</span>
            </div>
            
            <div className="bg-primary/5 hover:bg-primary/10 rounded-lg p-4 text-center cursor-pointer transition">
              <div className="text-primary text-2xl mb-2">
                <i className="ri-restaurant-line"></i>
              </div>
              <span className="font-medium">Food</span>
            </div>
            
            <div className="bg-primary/5 hover:bg-primary/10 rounded-lg p-4 text-center cursor-pointer transition">
              <div className="text-primary text-2xl mb-2">
                <i className="ri-more-line"></i>
              </div>
              <span className="font-medium">More</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8 text-center">What Our Users Say</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80" 
                  alt="User avatar" 
                  className="w-12 h-12 rounded-full mr-4 object-cover"
                />
                <div>
                  <h4 className="font-bold">Rahul Kapoor</h4>
                  <div className="flex text-amber-400">
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                </div>
              </div>
              <p className="text-gray-600">"I've been a fan of Sarah for years, and getting to talk to her directly was amazing! Worth every rupee."</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80" 
                  alt="User avatar" 
                  className="w-12 h-12 rounded-full mr-4 object-cover"
                />
                <div>
                  <h4 className="font-bold">Ananya Singh</h4>
                  <div className="flex text-amber-400">
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current text-gray-300" />
                  </div>
                </div>
              </div>
              <p className="text-gray-600">"Got amazing fitness tips from Priya during our video call. The interaction felt very personal and helpful."</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80" 
                  alt="User avatar" 
                  className="w-12 h-12 rounded-full mr-4 object-cover"
                />
                <div>
                  <h4 className="font-bold">Vikram Mehta</h4>
                  <div className="flex text-amber-400">
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current text-gray-300" />
                  </div>
                </div>
              </div>
              <p className="text-gray-600">"The tech advice I got from Marcus helped me choose the perfect laptop. This platform is revolutionary!"</p>
            </div>
          </div>
        </div>
      </section>

      <AuthModal open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
    </>
  );
};

export default Landing;
