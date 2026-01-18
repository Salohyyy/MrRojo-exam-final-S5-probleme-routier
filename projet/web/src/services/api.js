import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_URL,
});

// Intercepteur pour ajouter le token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('firebaseToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  checkAttempts: (email) => api.post('/api/auth/check-attempts', { email }),
  recordFailedAttempt: (email) => api.post('/api/auth/failed-attempt', { email }),
  recordSuccessfulLogin: () => api.post('/api/auth/successful-login'),
};

export const adminAPI = {
  getSettings: () => api.get('/api/admin/settings'),
  updateSessionDuration: (hours) => api.put('/api/admin/settings/session-duration', { hours }),
  updateMaxAttempts: (attempts) => api.put('/api/admin/settings/max-attempts', { attempts }),
  getBlockedUsers: () => api.get('/api/admin/users/blocked'),
  getAllUsers: () => api.get('/api/admin/users'),
  unblockUser: (uid) => api.post(`/api/admin/users/${uid}/unblock`),
};

export default api;