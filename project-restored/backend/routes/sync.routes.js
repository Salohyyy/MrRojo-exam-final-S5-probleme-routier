const express = require('express');
const router = express.Router();
const {
  getReportSyncs,
  getReportStatuses,
  updateReportStatus,
  updateReportSyncStatus,
  syncAllToFirebase
} = require('../controllers/sync.controller');

// Report Syncs
router.get('/report-syncs', getReportSyncs);
router.put('/report-syncs/:id/status', updateReportSyncStatus);

// Report Statuses
router.get('/report-statuses', getReportStatuses);

// Reports status update (override or addition to standard reports routes)
router.put('/reports/:id/status', updateReportStatus);

// Global Sync
router.post('/sync-all-to-firebase', syncAllToFirebase);

module.exports = router;
