const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const {
  createReport,
  getAllReports,
  getReportById,
  updateReport,
  uploadReport,
  uploadAllReports,
  syncDownload
} = require('../controllers/reportController');

// Routes mobiles (utilisateurs)
router.post('/create', verifyFirebaseToken, createReport);

// Routes managers
router.get('/local', verifyFirebaseToken, getAllReports);
router.get('/local/:id', verifyFirebaseToken, getReportById);
router.put('/local/:id', verifyFirebaseToken, updateReport);
router.post('/local/:id/upload', verifyFirebaseToken, uploadReport);
router.post('/sync/upload', verifyFirebaseToken, uploadAllReports);
router.post('/sync/download', verifyFirebaseToken, syncDownload);

module.exports = router;