import api from '../api.js';

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

  getAllOrders: async (page = 1, perPage = 20, status, dateFrom, dateTo, squareId = null) => {
    const params = { page, per_page: perPage };
    if (status) params.status = status;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (squareId) params.square_id = squareId;
    
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

  approveUser: async (userId, squareId = null, tenantId = null) => {
    const data = {};
    if (squareId) data.square_id = squareId;
    if (tenantId) data.tenant_id = tenantId;
    const response = await api.post(`/api/admin/users/${userId}/approve`, data);
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

  // Lixeira (Soft Delete)
  getDeletedUsers: async (days = null, userType = null) => {
    const params = {};
    if (days) params.days = days;
    if (userType) params.user_type = userType;
    const response = await api.get('/api/admin/deleted-users', { params });
    return response.data;
  },

  restoreUser: async (userId) => {
    const response = await api.post(`/api/admin/users/${userId}/restore`);
    return response.data;
  },

  deleteUserPermanent: async (userId) => {
    const response = await api.delete(`/api/admin/users/${userId}/permanent`);
    return response.data;
  },

  cleanupDeletedUsers: async (userIds) => {
    const response = await api.post('/api/admin/cleanup-deleted', { user_ids: userIds });
    return response.data;
  },

  getRetentionConfig: async () => {
    const response = await api.get('/api/admin/retention-config');
    return response.data;
  },

  updateRetentionConfig: async (days) => {
    const response = await api.put('/api/admin/retention-config', { retention_days: days });
    return response.data;
  },

  createAdminUser: async (adminData) => {
    const response = await api.post('/api/admin/create-admin', adminData);
    return response.data;
  },

  // Pedidos
  getOrders: async (page = 1, perPage = 20, status = '', squareId = null) => {
    const params = { page, per_page: perPage };
    if (status) params.status = status;
    if (squareId) params.square_id = squareId;
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
