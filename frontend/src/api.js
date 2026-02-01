// API utilities for backend communication
import axios from 'axios';
import cacheManager from './utils/cacheManager';

// Use explicit backend URL
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fdt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('fdt_token');
      localStorage.removeItem('fdt_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const registerUser = async (userData) => {
  const response = await api.post('/api/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post('/api/login', credentials);
  return response.data;
};

// User APIs
export const getUserDashboard = async () => {
  const cacheKey = 'user_dashboard';
  const cachedData = cacheManager.get(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  const response = await api.get('/api/user/dashboard');
  const data = response.data;
  cacheManager.set(cacheKey, data, 'dashboard');
  return data;
};

export const getUserTransactions = async (limit = 20, statusFilter = null) => {
  const params = { limit };
  if (statusFilter) params.status_filter = statusFilter;
  
  const cacheKey = `transactions_${limit}_${statusFilter || 'all'}`;
  const cachedData = cacheManager.get(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  const response = await api.get('/api/user/transactions', { params });
  const data = response.data;
  cacheManager.set(cacheKey, data, 'transactions');
  return data;
};

// Transaction APIs
export const createTransaction = async (transactionData) => {
  const response = await api.post('/api/transaction', transactionData);
  return response.data;
};

export const submitUserDecision = async (decisionData) => {
  const response = await api.post('/api/user-decision', decisionData);
  return response.data;
};

// Send Money specific APIs
export const searchUsers = async (phone) => {
  const response = await api.get('/api/users/search', { params: { phone } });
  return response.data;
};

export const confirmTransaction = async (txId) => {
  const response = await api.post('/api/transaction/confirm', { tx_id: txId });
  return response.data;
};

export const cancelTransaction = async (txId) => {
  const response = await api.post('/api/transaction/cancel', { tx_id: txId });
  return response.data;
};

export const getTransaction = async (txId) => {
  const response = await api.get(`/api/transaction/${txId}`);
  return response.data;
};

// Push notification APIs
export const registerPushToken = async (fcmToken, deviceId) => {
  const response = await api.post('/api/push-token', { fcm_token: fcmToken, device_id: deviceId });
  return response.data;
};

// Health check
export const healthCheck = async () => {
  const response = await api.get('/api/health');
  return response.data;
};

export default api;
