import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_URL,
});

// Intercepteur pour ajouter le token (employé OU utilisateur)
api.interceptors.request.use((config) => {
  // Token employé (JWT)
  const employeeToken = localStorage.getItem('employeeToken');
  // Token utilisateur Firebase
  const firebaseToken = localStorage.getItem('firebaseToken');
  
  if (employeeToken) {
    config.headers.Authorization = `Bearer ${employeeToken}`;
  } else if (firebaseToken) {
    config.headers.Authorization = `Bearer ${firebaseToken}`;
  }
  
  return config;
});

// Intercepteur pour gérer les tokens expirés
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.tokenExpired) {
      // Token expiré - nettoyer et rediriger
      localStorage.removeItem('employeeToken');
      localStorage.removeItem('firebaseToken');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// API pour l'authentification des employés (LOCALE)
export const employeeAPI = {
  login: (username, password) => 
    api.post('/api/employee-auth/login', { username, password }),
  verify: () => 
    api.get('/api/employee-auth/verify'),
};

// API pour l'authentification des utilisateurs (FIREBASE)
export const authAPI = {
  checkAttempts: (email) => 
    api.post('/api/auth/check-attempts', { email }),
  recordFailedAttempt: (email) => 
    api.post('/api/auth/failed-attempt', { email }),
  recordSuccessfulLogin: () => 
    api.post('/api/auth/successful-login'),
};

// API admin (employés uniquement)
export const adminAPI = {
  // Paramètres globaux
  getSettings: () => 
    api.get('/api/admin/settings'),
  updateSessionDuration: (minutes) => 
    api.put('/api/admin/settings/session-duration', { minutes }),
  updateDefaultMaxAttempts: (attempts) => 
    api.put('/api/admin/settings/max-attempts', { attempts }),
  
  // Gestion des utilisateurs Firebase
  getFirebaseUsers: () => 
    api.get('/api/admin/firebase-users'),
  updateUserMaxAttempts: (uid, max_attempts) => 
    api.put(`/api/admin/users/${uid}/max-attempts`, { max_attempts }),
  
  // Gestion des blocages
  getBlockedUsers: () => 
    api.get('/api/admin/users/blocked'),
  unblockUser: (uid) => 
    api.post(`/api/admin/users/${uid}/unblock`),
};

// ========================
// REPORTS API
// ========================
export const reportsAPI = {
  createReport: (data) => api.post('/api/reports/create', data),
  getAllReports: (filter = 'all') => api.get('/api/reports/local', { params: { filter } }),
  getReportById: (id) => api.get(`/api/reports/local/${id}`),
  updateReport: (id, data) => api.put(`/api/reports/local/${id}`, data),
  uploadReport: (id) => api.post(`/api/reports/local/${id}/upload`),
  uploadAllReports: () => api.post('/api/reports/sync/upload'),
  syncDownload: () => api.post('/api/reports/sync/download'),
  getReportSyncs: () => api.get('/api/reports/syncs'),
  getPublicReportSyncs: () => api.get('/api/visitor/reports/syncs'),
  updateReportSyncStatus: (id, statusId, progress) => api.put(`/api/reports/syncs/${id}/status`, { report_status_id: statusId, progress }),
  getReportPhotos: (reportId) => api.get(`/api/reports/${reportId}/photos`),
  addReportPhoto: (reportId, photoUrl) => api.post(`/api/reports/${reportId}/photos`, { photo_url: photoUrl }),
  deleteReportPhoto: (reportId, photoId) => api.delete(`/api/reports/${reportId}/photos/${photoId}`),
  getSyncStatus: () => api.get('/api/reports/sync/status'), 
};

export const utilsAPI = { 
  // ========================
  // COMPANIES
  // ========================
  getCompanies: () => api.get('/api/utils/companies'),
  createCompany: (data) => api.post('/api/utils/companies', data),
  updateCompany: (id, data) => api.put(`/api/utils/companies/${id}`, data),
  deleteCompany: (id) => api.delete(`/api/utils/companies/${id}`),

  // ========================
  // REPORT STATUSES
  // ========================
  getReportStatuses: () => api.get('/api/utils/report-statuses'),
  createReportStatus: (data) => api.post('/api/utils/report-statuses', data),
  updateReportStatus: (id, data) => api.put(`/api/utils/report-statuses/${id}`, data),
  deleteReportStatus: (id) => api.delete(`/api/utils/report-statuses/${id}`),

  // ========================
  // PROBLEM TYPES
  // ========================
  getProblemTypes: () => api.get('/api/utils/problem-types'),
};

export default api;