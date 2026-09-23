import api from '../api.js';

// Relatórios + Tenant/White-label settings
export const adminReportsMethods = {
  // Relatórios
  getOrdersByDate: async (days = 30, squareId = null) => {
    const params = { days };
    if (squareId) params.square_id = squareId;
    const response = await api.get('/api/admin/reports/orders-by-date', { params });
    return response.data;
  },

  getDriversPerformance: async (days = 30, squareId = null) => {
    const params = { days };
    if (squareId) params.square_id = squareId;
    const response = await api.get('/api/admin/reports/drivers-performance', { params });
    return response.data;
  },

  getEstablishmentsRanking: async (days = 30, squareId = null) => {
    const params = { days };
    if (squareId) params.square_id = squareId;
    const response = await api.get('/api/admin/reports/establishments-ranking', { params });
    return response.data;
  },

  getFinancialSummary: async (days = 30, squareId = null) => {
    const params = { days };
    if (squareId) params.square_id = squareId;
    const response = await api.get('/api/admin/reports/financial-summary', { params });
    return response.data;
  },

  getCancellations: async (days = 30, squareId = null) => {
    const params = { days };
    if (squareId) params.square_id = squareId;
    const response = await api.get('/api/admin/reports/cancellations', { params });
    return response.data;
  },

  getRatings: async (days = 30, squareId = null) => {
    const params = { days };
    if (squareId) params.square_id = squareId;
    const response = await api.get('/api/admin/reports/ratings', { params });
    return response.data;
  },

  getPeakHours: async (days = 30, squareId = null) => {
    const params = { days };
    if (squareId) params.square_id = squareId;
    const response = await api.get('/api/admin/reports/peak-hours', { params });
    return response.data;
  },

  getDeliveriesByDriver: async (days = 30, squareId = null) => {
    const params = { days };
    if (squareId) params.square_id = squareId;
    const response = await api.get('/api/admin/reports/deliveries-by-driver', { params });
    return response.data;
  },

  // Tenant/White-label settings
  getTenantSettings: async () => {
    const response = await api.get('/api/admin/tenant/settings');
    return response.data;
  },

  updateTenantSettings: async (settings) => {
    const response = await api.put('/api/admin/tenant/settings', settings);
    return response.data;
  },

  uploadTenantLogo: async (logoData, filename = 'logo.png') => {
    const response = await api.post('/api/admin/tenant/logo', {
      logo_data: logoData,
      filename: filename
    });
    return response.data;
  },
};
