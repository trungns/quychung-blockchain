import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

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
  getBalance: (id) => api.get(`/treasuries/${id}/balance`),
};

// Transaction API
export const transactionAPI = {
  create: (treasuryId, data) => api.post(`/treasuries/${treasuryId}/transactions`, data),
  getAll: (treasuryId) => api.get(`/treasuries/${treasuryId}/transactions`),
};

// Report API
export const reportAPI = {
  getIncomeByMember: (treasuryId, year) => api.get(`/treasuries/${treasuryId}/reports/income-by-member`, { params: { year } }),
  getMonthlyExpense: (treasuryId, year) => api.get(`/treasuries/${treasuryId}/reports/monthly-expense`, { params: { year } }),
  getYearlySummary: (treasuryId) => api.get(`/treasuries/${treasuryId}/reports/yearly-summary`),
  getTopContributors: (treasuryId, limit = 10) => api.get(`/treasuries/${treasuryId}/reports/top-contributors`, { params: { limit } }),
};

export default api;
