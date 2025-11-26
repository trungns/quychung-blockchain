import axios from 'axios';

// Use relative path - works for both localhost and production
// In production: https://quychung.wellytech.vn/api
// In development: http://localhost:3000/api (proxied to backend)
const API_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
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

// Auth API
export const authAPI = {
  googleLogin: (code) => api.post('/auth/google-login', { code }),
  getAuthUrl: () => api.get('/auth/google'),
};

// Treasury API
export const treasuryAPI = {
  create: (data) => api.post('/treasuries', data),
  getAll: () => api.get('/treasuries'),
  getById: (id) => api.get(`/treasuries/${id}`),
  addMember: (id, data) => api.post(`/treasuries/${id}/members`, data),
  updateMemberRole: (treasuryId, memberId, data) => api.put(`/treasuries/${treasuryId}/members/${memberId}`, data),
  removeMember: (treasuryId, memberId) => api.delete(`/treasuries/${treasuryId}/members/${memberId}`),
  getBalance: (id) => api.get(`/treasuries/${id}/balance`),
  getBankAccount: (id) => api.get(`/treasuries/${id}/bank-account`),
  updateBankAccount: (id, data) => api.put(`/treasuries/${id}/bank-account`, data),
  deleteBankAccount: (id) => api.delete(`/treasuries/${id}/bank-account`),
};

// Transaction API
export const transactionAPI = {
  create: (treasuryId, data) => api.post(`/treasuries/${treasuryId}/transactions`, data),
  getAll: (treasuryId, statusFilter) => {
    const params = statusFilter ? { status: statusFilter } : {};
    return api.get(`/treasuries/${treasuryId}/transactions`, { params });
  },
  update: (treasuryId, txId, data) => api.put(`/treasuries/${treasuryId}/transactions/${txId}`, data),
  delete: (treasuryId, txId) => api.delete(`/treasuries/${treasuryId}/transactions/${txId}`),
  confirm: (treasuryId, txId, data) => api.post(`/treasuries/${treasuryId}/transactions/${txId}/confirm`, data),
  reject: (treasuryId, txId, data) => api.post(`/treasuries/${treasuryId}/transactions/${txId}/reject`, data),
  retryBlockchain: (treasuryId, txId) => api.post(`/treasuries/${treasuryId}/transactions/${txId}/retry-blockchain`),
};

// Report API
export const reportAPI = {
  getIncomeByMember: (treasuryId, year) => api.get(`/treasuries/${treasuryId}/reports/income-by-member`, { params: { year } }),
  getMonthlyExpense: (treasuryId, year) => api.get(`/treasuries/${treasuryId}/reports/monthly-expense`, { params: { year } }),
  getYearlySummary: (treasuryId) => api.get(`/treasuries/${treasuryId}/reports/yearly-summary`),
  getTopContributors: (treasuryId, limit = 10) => api.get(`/treasuries/${treasuryId}/reports/top-contributors`, { params: { limit } }),
};

export default api;
