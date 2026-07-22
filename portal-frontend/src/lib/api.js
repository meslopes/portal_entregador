// Configuração da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://muvlog-api.onrender.com';


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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Serviços de autenticação
export const authService = {
  login: async (email, password) => {
    // Corrigido para usar o endpoint correto do backend
    const response = await api.post('/api/auth/login', { email, password });
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

  updateOrderStatus: async (orderId, status) => {
    const response = await api.put(`/api/orders/${orderId}/status`, { status });
    return response.data;
  },

  getCurrentOrder: async () => {
    const response = await api.get('/api/orders/current');
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
    if (status) params.status = status;
    const response = await api.get('/api/orders/my', { params });
    return response.data;
  },

  getMyStats: async () => {
    const response = await api.get('/api/orders/my/stats');
    return response.data;
  },
};

// Serviços administrativos
export const adminService = {
  getDashboard: async () => {
    const response = await api.get('/api/admin/dashboard');
    return response.data;
  },

  getDrivers: async (page = 1, perPage = 20, search = '', status = 'all') => {
    const response = await api.get('/api/admin/drivers', {
      params: { page, per_page: perPage, search, status },
    });
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

  getFinanceDashboard: async (period = 'month') => {
    const response = await api.get('/api/admin/finance', { params: { period } });
    return response.data;
  },

  getFinanceByEstablishment: async (period = 'month') => {
    const response = await api.get('/api/admin/finance/establishments', { params: { period } });
    return response.data;
  },

  getLiveTracking: async () => {
    const response = await api.get('/api/admin/live-tracking');
    return response.data;
  },

  // Gestão de Estabelecimentos
  getEstablishments: async (page = 1, perPage = 20, search = '') => {
    const response = await api.get('/api/admin/establishments', {
      params: { page, per_page: perPage, search },
    });
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

  deleteEstablishment: async (establishmentId) => {
    const response = await api.delete(`/api/admin/establishments/${establishmentId}`);
    return response.data;
  },
};

// Utilitários
export const utils = {
  formatCurrency: (value) => {
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
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
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

