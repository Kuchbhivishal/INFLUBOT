import { apiRequest } from "@/lib/queryClient";

export const influencerService = {
  // Get all influencers
  getAllInfluencers: async () => {
    try {
      const response = await fetch('/api/influencers', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch influencers');
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching influencers:", error);
      throw error;
    }
  },
  
  // Get featured influencers
  getFeaturedInfluencers: async () => {
    try {
      const response = await fetch('/api/influencers/featured', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch featured influencers');
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching featured influencers:", error);
      throw error;
    }
  },
  
  // Get influencers by category
  getInfluencersByCategory: async (category: string) => {
    try {
      const response = await fetch(`/api/influencers/category/${category}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch influencers by category');
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching influencers by category:", error);
      throw error;
    }
  },
  
  // Get single influencer
  getInfluencer: async (userId: number) => {
    try {
      const response = await fetch(`/api/influencers/${userId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch influencer');
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error fetching influencer:", error);
      throw error;
    }
  },
  
  // Update influencer status (online/offline)
  updateInfluencerStatus: async (userId: number, isOnline: boolean) => {
    try {
      const response = await apiRequest("PATCH", `/api/influencers/${userId}/status`, {
        isOnline
      });
      
      return await response.json();
    } catch (error) {
      console.error("Error updating influencer status:", error);
      throw error;
    }
  }
};
