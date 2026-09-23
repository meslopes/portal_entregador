// Configuração da API
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://muvlog-api-890250693883.us-central1.run.app';

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
    // Não sobrescrever se já tem Authorization (ex: own-driver token)
    if (!config.headers.Authorization) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
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
  async (error) => {
    const config = error.config;

    // Retry automático para erros de rede ou cold start do Cloud Run (GETs apenas)
    const isGetRequest = config?.method === 'get';
    const isNetworkError = !error.response;
    const isColdStart = [502, 503, 504].includes(error.response?.status);
    const retryCount = config?._retryCount || 0;

    if (isGetRequest && (isNetworkError || isColdStart) && retryCount < 2) {
      config._retryCount = retryCount + 1;
      // Aguardar 3s na 1a tentativa, 5s na 2a para o Cloud Run acordar
      const delay = retryCount === 0 ? 3000 : 5000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return api.request(config);
    }

    if (error.response?.status === 401 && !isRedirecting) {
      // NÃO redirecionar se o 401 veio do próprio endpoint de login
      const isLoginRequest = error.config?.url?.includes('/api/auth/login');
      if (isLoginRequest) {
        // Deixa o erro propagar para o componente tratar
        return Promise.reject(error);
      }

      // NÃO redirecionar se estiver na página de aguardando aprovação
      const isPendingApproval = window.location.pathname === '/pending-approval';
      if (isPendingApproval) {
        return Promise.reject(error);
      }

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
      // Reseta flag após 2s para permitir novo redirect se necessário
      setTimeout(() => { isRedirecting = false; }, 2000);
    }

    // Entregador convertido de plataforma para próprio — forçar redirect
    if (error.response?.status === 409 && error.response?.data?.error === 'convertido_proprio') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      alert('Você foi transferido para entregador próprio. Faça login novamente pelo aplicativo de entregador próprio.');
      window.location.href = '/own-driver/login';
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

// Re-exportar todos os serviços para manter compatibilidade com imports existentes
export { authService } from './services/authService.js';
export { driverService } from './services/driverService.js';
export { orderService } from './services/orderService.js';
export { adminService } from './services/adminService.js';
export { utils } from './services/utils.js';

export default api;
