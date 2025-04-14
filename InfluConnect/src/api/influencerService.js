import { apiRequest } from './apiClient';

const influencerService = {
  // Get all influencers
  getAllInfluencers: async () => {
    return await apiRequest('GET', '/api/influencers');
  },

  // Get featured influencers
  getFeaturedInfluencers: async () => {
    return await apiRequest('GET', '/api/influencers/featured');
  },

  // Get influencers by category
  getInfluencersByCategory: async (category) => {
    return await apiRequest('GET', `/api/influencers/category/${category}`);
  },

  // Get influencer profile
  getInfluencerProfile: async (id) => {
    return await apiRequest('GET', `/api/influencers/${id}`);
  },
  
  // Update influencer status (online/offline)
  updateStatus: async (status) => {
    return await apiRequest('PATCH', '/api/influencers/status', { status });
  },
  
  // Get influencer stats
  getInfluencerStats: async () => {
    return await apiRequest('GET', '/api/influencers/stats');
  },
  
  // Get missed calls
  getMissedCalls: async () => {
    return await apiRequest('GET', '/api/influencers/missed-calls');
  }
};

export default influencerService;