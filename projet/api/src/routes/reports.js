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
  addPhotosToReport,
  getReportPhotos,
  deleteReportPhoto,
  getSyncStatus  // Ajoutez cette ligne
} = require('../controllers/reportController');

// Routes mobiles (utilisateurs Firebase uniquement)
router.post('/create', verifyFirebaseToken, createReport);

// Routes managers (employés OU utilisateurs Firebase)
router.get('/syncs', verifyAnyToken, getReportSyncs);
router.put('/syncs/:id/status', verifyAnyToken, updateReportSyncStatus);
router.get('/local', verifyAnyToken, getAllReports);
router.get('/local/:id', verifyAnyToken, getReportById);
router.put('/local/:id', verifyAnyToken, updateReport);
router.post('/local/:id/upload', verifyAnyToken, uploadReport);
router.post('/sync/upload', verifyAnyToken, uploadAllReports);
router.post('/sync/download', verifyAnyToken, syncDownload);
router.get('/sync/status', verifyAnyToken, getSyncStatus);  //  Ajoutez cette ligne

// Routes pour les photos
router.get('/:reportId/photos', verifyAnyToken, getReportPhotos);
router.post('/:reportId/photos', verifyAnyToken, addPhotosToReport);  //  Ajoutez cette ligne
router.delete('/:reportId/photos/:photoId', verifyAnyToken, deleteReportPhoto);

module.exports = router;