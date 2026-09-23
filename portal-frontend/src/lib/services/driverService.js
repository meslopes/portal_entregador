import api from '../api.js';

// Serviços do entregador
export const driverService = {
  toggleOnlineStatus: async (isOnline, latitude, longitude) => {
    const response = await api.post('/api/driver/status', {
      is_online: isOnline,
      latitude,
      longitude,
    });
    return response.data;
  },

  updateLocation: async (latitude, longitude) => {
    const response = await api.post('/api/driver/location', {
      latitude,
      longitude,
    });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/api/driver/stats');
    return response.data;
  },

  getEarningsHistory: async (page = 1, perPage = 20, startDate, endDate) => {
    const params = { page, per_page: perPage };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const response = await api.get('/api/driver/earnings', { params });
    return response.data;
  },

  getDeliveryHistory: async (page = 1, perPage = 20) => {
    const response = await api.get('/api/driver/delivery-history', {
      params: { page, per_page: perPage },
    });
    return response.data;
  },

  getRanking: async () => {
    const response = await api.get('/api/driver/ranking');
    return response.data;
  },

  getAchievements: async () => {
    const response = await api.get('/api/driver/achievements');
    return response.data;
  },
};
