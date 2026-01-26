const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getReportStatuses,
  createReportStatus,
  updateReportStatus,
  deleteReportStatus,
  getProblemTypes
} = require('../controllers/utilsController');

// Routes Companies
router.get('/companies', verifyFirebaseToken, getCompanies);
router.post('/companies', verifyFirebaseToken, createCompany);
router.put('/companies/:id', verifyFirebaseToken, updateCompany);
router.delete('/companies/:id', verifyFirebaseToken, deleteCompany);

// Routes Report Statuses
router.get('/report-statuses', verifyFirebaseToken, getReportStatuses);
router.post('/report-statuses', verifyFirebaseToken, createReportStatus);
router.put('/report-statuses/:id', verifyFirebaseToken, updateReportStatus);
router.delete('/report-statuses/:id', verifyFirebaseToken, deleteReportStatus);

// Routes Problem Types
router.get('/problem-types', verifyFirebaseToken, getProblemTypes);

module.exports = router;