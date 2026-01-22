// API utilities for backend communication
import axios from 'axios';

// Use relative URL for API calls (works with any domain/preview URL)
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || '/api';

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
  const response = await api.post('/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post('/login', credentials);
  return response.data;
};

// User APIs
export const getUserDashboard = async () => {
  const response = await api.get('/user/dashboard');
  return response.data;
};

export const getUserTransactions = async (limit = 20, statusFilter = null) => {
  const params = { limit };
  if (statusFilter) params.status_filter = statusFilter;
  const response = await api.get('/user/transactions', { params });
  return response.data;
};

// Transaction APIs
export const createTransaction = async (transactionData) => {
  const response = await api.post('/transaction', transactionData);
  return response.data;
};

export const submitUserDecision = async (decisionData) => {
  const response = await api.post('/user-decision', decisionData);
  return response.data;
};

// Push notification APIs
export const registerPushToken = async (fcmToken, deviceId) => {
  const response = await api.post('/push-token', { fcm_token: fcmToken, device_id: deviceId });
  return response.data;
};

// Health check
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
