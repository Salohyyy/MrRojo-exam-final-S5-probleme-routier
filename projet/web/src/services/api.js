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

// Intercepteur pour gérer les sessions expirées
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.sessionExpired || error.response?.data?.tokenExpired) {
      // Session ou token expiré - rediriger vers login
      localStorage.removeItem('firebaseToken');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  checkAttempts: (email) => api.post('/api/auth/check-attempts', { email }),
  recordFailedAttempt: (email) => api.post('/api/auth/failed-attempt', { email }),
  recordSuccessfulLogin: () => api.post('/api/auth/successful-login'),
  checkSession: () => api.get('/api/auth/check-session'),
};

export const adminAPI = {
  // Paramètres globaux
  getSettings: () => api.get('/api/admin/settings'),
  updateSessionDuration: (minutes) => api.put('/api/admin/settings/session-duration', { minutes }),
  updateDefaultMaxAttempts: (attempts) => api.put('/api/admin/settings/max-attempts', { attempts }),
  
  // Gestion des utilisateurs Firebase
  getFirebaseUsers: () => api.get('/api/admin/firebase-users'),
  syncFirebaseUser: (firebase_uid, data) => api.post(`/api/admin/firebase-users/${firebase_uid}/sync`, data),
  syncAllFirebaseUsers: () => api.post('/api/admin/firebase-users/sync-all'),
  
  // Paramètres utilisateur spécifique
  updateUserMaxAttempts: (firebase_uid, max_attempts) => 
    api.put(`/api/admin/users/${firebase_uid}/max-attempts`, { max_attempts }),
  
  // Gestion des blocages
  getBlockedUsers: () => api.get('/api/admin/users/blocked'),
  unblockUser: (firebase_uid) => api.post(`/api/admin/users/${firebase_uid}/unblock`),
};

export default api;