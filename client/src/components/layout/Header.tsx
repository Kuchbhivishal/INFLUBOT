import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AuthModal from "../auth/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";

export function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { balance } = useWallet();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log("Searching for:", searchQuery);
  };

  return (
    <header className="sticky top-0 bg-white shadow-sm z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/">
            <span className="text-2xl font-bold text-primary mr-2 cursor-pointer">InfluConnect</span>
          </Link>
        </div>
        
        <div className="hidden md:flex items-center space-x-4">
          <form onSubmit={handleSearch} className="relative">
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
        
        <div className="flex items-center space-x-2 md:space-x-4">
          {isAuthenticated ? (
            <>
              <Link href="/wallet">
                <Button variant="outline" className="flex items-center bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 transition">
                  <i className="ri-wallet-3-line mr-2 text-primary"></i>
                  <span className="font-medium">₹{balance.toFixed(2)}</span>
                </Button>
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative p-0">
                    <Avatar className="w-9 h-9">
                      {user?.profileImage ? (
                        <AvatarImage src={user.profileImage} alt={user.fullName || user.username} />
                      ) : (
                        <AvatarFallback className="bg-gray-300">
                          <i className="ri-user-line text-2xl text-gray-500"></i>
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => window.location.href = '/dashboard'} className="flex items-center">
                    <i className="ri-user-line mr-2"></i> My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/wallet'} className="flex items-center">
                    <i className="ri-wallet-3-line mr-2"></i> Wallet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/dashboard'} className="flex items-center">
                    <i className="ri-history-line mr-2"></i> History
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/dashboard'} className="flex items-center">
                    <i className="ri-settings-3-line mr-2"></i> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-500">
                    <i className="ri-logout-box-line mr-2"></i> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button 
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 font-medium transition flex items-center"
              onClick={() => setIsAuthModalOpen(true)}
            >
              <i className="ri-login-box-line mr-2"></i>
              Login / Sign Up
            </Button>
          )}
        </div>
      </div>
      
      {/* Mobile Search */}
      <div className="md:hidden px-4 pb-3">
        <form onSubmit={handleSearch} className="relative">
          <Input
            type="text"
            placeholder="Search influencers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <i className="ri-search-line absolute left-3 top-2.5 text-gray-400"></i>
        </form>
      </div>

      <AuthModal open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
    </header>
  );
}
