import api from '../api.js';

// Serviços de autenticação
export const authService = {
  login: async (email, password, tenantSlug = null, userType = null) => {
    // Corrigido para usar o endpoint correto do backend
    const payload = { email, password };
    if (tenantSlug) payload.tenant_slug = tenantSlug;
    if (userType) payload.user_type = userType;
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
