import api from '../api.js';

// Serviços de pedidos
export const orderService = {
  getAvailableOrders: async () => {
    const response = await api.get('/api/orders/available');
    return response.data;
  },

  acceptOrder: async (orderId) => {
    const response = await api.post(`/api/orders/${orderId}/accept`);
    return response.data;
  },

  rejectOrder: async (orderId) => {
    const response = await api.post(`/api/orders/${orderId}/reject`);
    return response.data;
  },

  updateOrderStatus: async (orderId, status, payload = {}) => {
    const response = await api.put(`/api/orders/${orderId}/status`, { status, ...payload });
    return response.data;
  },

  getCurrentOrder: async () => {
    const response = await api.get('/api/orders/current');
    return response.data;
  },

  getActiveOrders: async () => {
    const response = await api.get('/api/orders/active');
    return response.data;
  },

  getOrderDetails: async (orderId) => {
    const response = await api.get(`/api/orders/${orderId}`);
    return response.data;
  },

  createOrder: async (orderData) => {
    const response = await api.post('/api/orders/', orderData);
    return response.data;
  },

  // Pedidos do estabelecimento
  getMyOrders: async (page = 1, perPage = 20, status = '') => {
    const params = { page, per_page: perPage };
    // Grupos de status especiais
    if (status === 'active' || status === 'pending') {
      params.status_group = status;
    } else if (status) {
      params.status = status;
    }
    const response = await api.get('/api/orders/my', { params });
    return response.data;
  },

  getMyStats: async () => {
    const response = await api.get('/api/orders/my/stats');
    return response.data;
  },

  getMyTracking: async () => {
    const response = await api.get('/api/orders/my/tracking');
    return response.data;
  },

  getMyFinancial: async () => {
    const response = await api.get('/api/orders/my/financial');
    return response.data;
  },

  generateInvoice: async (restaurantId, weekStart, weekEnd) => {
    const response = await api.post(`/api/admin/invoices/${restaurantId}/generate`, {
      week_start: weekStart,
      week_end: weekEnd
    });
    return response.data;
  },

  rateOrder: async (orderId, rating, feedback = '') => {
    const response = await api.post(`/api/orders/${orderId}/rate`, { rating, feedback });
    return response.data;
  },

  cancelOrder: async (orderId) => {
    const response = await api.post(`/api/orders/${orderId}/cancel`);
    return response.data;
  },

  callPlatformDrivers: async (orderId) => {
    const response = await api.post(`/api/orders/${orderId}/call-platform`);
    return response.data;
  },

  assignOwnDriver: async (orderId, establishmentDriverId) => {
    const response = await api.post(`/api/orders/${orderId}/assign-own`, {
      establishment_driver_id: establishmentDriverId
    });
    return response.data;
  },
};
