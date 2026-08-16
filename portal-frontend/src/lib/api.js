// Configuração da API
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com';


// Instância do axios com configurações padrão
import axios from 'axios';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
let isRedirecting = false;
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;
      // Verificar se é rota de own-driver
      const isOwnDriverRequest = error.config?.url?.includes('/api/own-driver/');
      if (isOwnDriverRequest) {
        localStorage.removeItem('own_driver_token');
        localStorage.removeItem('own_driver_data');
        localStorage.removeItem('own_driver_restaurant');
        window.location.href = '/own-driver/login';
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Serviços de autenticação
export const authService = {
  login: async (email, password, tenantSlug = null) => {
    // Corrigido para usar o endpoint correto do backend
    const payload = { email, password };
    if (tenantSlug) payload.tenant_slug = tenantSlug;
    const response = await api.post('/api/auth/login', payload);
    return response.data;
  },

  register: async (userData) => {
    // Corrigido para usar o endpoint correto do backend
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/api/auth/profile');
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/api/auth/profile', userData);
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },
};

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

// Serviços administrativos
export const adminService = {
  getDashboard: async (squareId = null) => {
    const params = {};
    if (squareId) params.square_id = squareId;
    const response = await api.get('/api/admin/dashboard', { params });
    return response.data;
  },

  processScheduledOrders: async () => {
    const response = await api.post('/api/admin/process-scheduled');
    return response.data;
  },

  getDrivers: async (page = 1, perPage = 20, search = '', status = 'all', squareId = null) => {
    const params = { page, per_page: perPage, search, status };
    if (squareId) params.square_id = squareId;
    const response = await api.get('/api/admin/drivers', { params });
    return response.data;
  },

  getDriverDetails: async (driverId) => {
    const response = await api.get(`/api/admin/drivers/${driverId}`);
    return response.data;
  },

  updateDriverStatus: async (driverId, status) => {
    const response = await api.put(`/api/admin/drivers/${driverId}/status`, { status });
    return response.data;
  },

  getAllOrders: async (page = 1, perPage = 20, status, dateFrom, dateTo) => {
    const params = { page, per_page: perPage };
    if (status) params.status = status;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    
    const response = await api.get('/api/admin/orders', { params });
    return response.data;
  },

  assignOrderToDriver: async (orderId, driverId) => {
    const response = await api.post(`/api/admin/orders/${orderId}/assign`, {
      driver_id: driverId,
    });
    return response.data;
  },

  getEarningsReport: async (dateFrom, dateTo) => {
    const params = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    
    const response = await api.get('/api/admin/reports/earnings', { params });
    return response.data;
  },

  getFinanceDashboard: async (period = 'month', dateFrom, dateTo, squareId = null) => {
    const params = { period };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (squareId) params.square_id = squareId;
    const response = await api.get('/api/admin/finance', { params });
    return response.data;
  },

  getFinanceByEstablishment: async (period = 'month', dateFrom, dateTo, squareId = null) => {
    const params = { period };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (squareId) params.square_id = squareId;
    const response = await api.get('/api/admin/finance/establishments', { params });
    return response.data;
  },

  getLiveTracking: async (squareId = null) => {
    const params = {};
    if (squareId) params.square_id = squareId;
    const response = await api.get('/api/admin/live-tracking', { params });
    return response.data;
  },

  // Gestão de Estabelecimentos
  getEstablishments: async (page = 1, perPage = 20, search = '', squareId = null) => {
    const params = { page, per_page: perPage, search };
    if (squareId) params.square_id = squareId;
    const response = await api.get('/api/admin/establishments', { params });
    return response.data;
  },

  getEstablishmentDetails: async (establishmentId) => {
    const response = await api.get(`/api/admin/establishments/${establishmentId}`);
    return response.data;
  },

  createEstablishment: async (establishmentData) => {
    const response = await api.post('/api/admin/establishments', establishmentData);
    return response.data;
  },

  updateEstablishment: async (establishmentId, establishmentData) => {
    const response = await api.put(`/api/admin/establishments/${establishmentId}`, establishmentData);
    return response.data;
  },

  deleteEstablishment: async (establishmentId, force = false) => {
    const url = force ? `/api/admin/establishments/${establishmentId}?force=true` : `/api/admin/establishments/${establishmentId}`;
    const response = await api.delete(url);
    return response.data;
  },

  // Praças
  getSquares: async () => {
    const response = await api.get('/api/admin/squares');
    return response.data;
  },

  createSquare: async (squareData) => {
    const response = await api.post('/api/admin/squares', squareData);
    return response.data;
  },

  updateSquare: async (squareId, squareData) => {
    const response = await api.put(`/api/admin/squares/${squareId}`, squareData);
    return response.data;
  },

  // Tabelas de preços
  getPricingTables: async (squareId = null) => {
    const params = squareId ? `?square_id=${squareId}` : '';
    const response = await api.get(`/api/admin/pricing-tables${params}`);
    return response.data;
  },

  getPricingTable: async (tableId) => {
    const response = await api.get(`/api/admin/pricing-tables/${tableId}`);
    return response.data;
  },

  createPricingTable: async (tableData) => {
    const response = await api.post('/api/admin/pricing-tables', tableData);
    return response.data;
  },

  updatePricingTable: async (tableId, tableData) => {
    const response = await api.put(`/api/admin/pricing-tables/${tableId}`, tableData);
    return response.data;
  },

  deletePricingTable: async (tableId) => {
    const response = await api.delete(`/api/admin/pricing-tables/${tableId}`);
    return response.data;
  },

  // Dynamic Pricing (Taxas Adicionais)
  getDynamicPricing: async (squareId = null) => {
    const params = {};
    if (squareId) params.square_id = squareId;
    const response = await api.get('/api/admin/dynamic-pricing', { params });
    return response.data;
  },

  createDynamicPricing: async (data) => {
    const response = await api.post('/api/admin/dynamic-pricing', data);
    return response.data;
  },

  updateDynamicPricing: async (configId, data) => {
    const response = await api.put(`/api/admin/dynamic-pricing/${configId}`, data);
    return response.data;
  },

  deleteDynamicPricing: async (configId) => {
    const response = await api.delete(`/api/admin/dynamic-pricing/${configId}`);
    return response.data;
  },

  deleteSquare: async (squareId) => {
    const response = await api.delete(`/api/admin/squares/${squareId}`);
    return response.data;
  },

  // Asaas (Gateway de Pagamento)
  getAsaasConfig: async () => {
    const response = await api.get('/api/admin/asaas/config');
    return response.data;
  },

  updateAsaasConfig: async (data) => {
    const response = await api.put('/api/admin/asaas/config', data);
    return response.data;
  },

  testAsaasConnection: async () => {
    const response = await api.post('/api/admin/asaas/test');
    return response.data;
  },

  generateAutoInvoices: async () => {
    const response = await api.post('/api/admin/invoices/generate-auto');
    return response.data;
  },

  createInvoiceCharge: async (invoiceId) => {
    const response = await api.post(`/api/admin/invoices/${invoiceId}/charge`);
    return response.data;
  },

  sendInvoicePaymentLink: async (invoiceId, paymentUrl) => {
    const response = await api.post(`/api/admin/invoices/${invoiceId}/send-link`, { payment_url: paymentUrl });
    return response.data;
  },

  processWithdrawalAuto: async (withdrawalId) => {
    const response = await api.post(`/api/admin/withdrawals/${withdrawalId}/process-auto`);
    return response.data;
  },

  // Pedidos admin
  adminUpdateOrder: async (orderId, data) => {
    const response = await api.put(`/api/admin/orders/${orderId}`, data);
    return response.data;
  },

  adminDeleteOrder: async (orderId) => {
    const response = await api.delete(`/api/admin/orders/${orderId}`);
    return response.data;
  },

  // Credenciais de Plataformas (iFood, etc.)
  getPlatformCredentials: async (restaurantId) => {
    const params = restaurantId ? `?restaurant_id=${restaurantId}` : '';
    const response = await api.get(`/api/admin/platform-credentials${params}`);
    return response.data;
  },

  createPlatformCredential: async (data) => {
    const response = await api.post('/api/admin/platform-credentials', data);
    return response.data;
  },

  deletePlatformCredential: async (credId) => {
    const response = await api.delete(`/api/admin/platform-credentials/${credId}`);
    return response.data;
  },

  testPlatformCredential: async (credId) => {
    const response = await api.post(`/api/admin/platform-credentials/${credId}/test`);
    return response.data;
  },

  // Aprovacao de cadastros
  getPendingUsers: async () => {
    const response = await api.get('/api/admin/pending-users');
    return response.data;
  },

  approveUser: async (userId) => {
    const response = await api.post(`/api/admin/users/${userId}/approve`);
    return response.data;
  },

  rejectUser: async (userId) => {
    const response = await api.post(`/api/admin/users/${userId}/reject`);
    return response.data;
  },

  // Gestao de usuarios
  getAllUsers: async (page = 1, perPage = 20, type = '', search = '') => {
    const params = { page, per_page: perPage };
    if (type) params.type = type;
    if (search) params.search = search;
    const response = await api.get('/api/admin/users', { params });
    return response.data;
  },

  getUserDetails: async (userId) => {
    const response = await api.get(`/api/admin/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId, userData) => {
    const response = await api.put(`/api/admin/users/${userId}`, userData);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/api/admin/users/${userId}`);
    return response.data;
  },

  createAdminUser: async (adminData) => {
    const response = await api.post('/api/admin/create-admin', adminData);
    return response.data;
  },

  // Pedidos
  getOrders: async (page = 1, perPage = 20, status = '') => {
    const params = { page, per_page: perPage };
    if (status) params.status = status;
    const response = await api.get('/api/admin/orders', { params });
    return response.data;
  },

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

// Utilitários
export const utils = {
  formatCurrency: (value) => {
    if (value == null || isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  },

  formatDate: (date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  },

  formatDateTime: (date) => {
    if (!date) return '';
    const str = typeof date === 'string' && !date.endsWith('Z') ? date + 'Z' : date;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(str));
  },

  formatTime: (date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  },

  getStatusColor: (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACCEPTED: 'bg-blue-100 text-blue-800',
      PREPARING: 'bg-orange-100 text-orange-800',
      READY: 'bg-purple-100 text-purple-800',
      PICKED_UP: 'bg-indigo-100 text-indigo-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      SUSPENDED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },

  getStatusText: (status) => {
    const texts = {
      PENDING: 'Pendente',
      ACCEPTED: 'Aceito',
      PREPARING: 'Preparando',
      READY: 'Pronto',
      PICKED_UP: 'Coletado',
      DELIVERED: 'Entregue',
      CANCELLED: 'Cancelado',
      ACTIVE: 'Ativo',
      INACTIVE: 'Inativo',
      SUSPENDED: 'Suspenso',
      CAR: 'Carro',
      MOTORCYCLE: 'Moto',
      BICYCLE: 'Bicicleta',
      FOOT: 'A pé',
      CASH: 'Dinheiro',
      CARD: 'Cartão',
      PIX: 'PIX',
    };
    return texts[status] || status;
  },

  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },
};

export default api;

