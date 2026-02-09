const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, verifyAnyToken } = require('../middleware/auth');
const {
  createReport,
  getAllReports,
  getReportById,
  updateReport,
  uploadReport,
  uploadAllReports,
  syncDownload,
  getReportSyncs,
  updateReportSyncStatus,
  getReportSyncHistories,
  getAllReportSyncHistories
} = require('../controllers/reportController');

// Routes mobiles (utilisateurs Firebase uniquement)
router.post('/create', verifyFirebaseToken, createReport);

// Routes managers (employés OU utilisateurs Firebase)
router.get('/syncs', verifyAnyToken, getReportSyncs);
router.get('/syncs/histories', verifyAnyToken, getAllReportSyncHistories);
router.get('/syncs/:id/histories', verifyAnyToken, getReportSyncHistories);
router.put('/syncs/:id/status', verifyAnyToken, updateReportSyncStatus);
router.get('/local', verifyAnyToken, getAllReports);
router.get('/local/:id', verifyAnyToken, getReportById);
router.put('/local/:id', verifyAnyToken, updateReport);
router.post('/local/:id/upload', verifyAnyToken, uploadReport);
router.post('/sync/upload', verifyAnyToken, uploadAllReports);
router.post('/sync/download', verifyAnyToken, syncDownload);

module.exports = router;