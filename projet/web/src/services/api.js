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