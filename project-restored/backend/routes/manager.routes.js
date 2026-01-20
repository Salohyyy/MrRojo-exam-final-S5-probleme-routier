const express = require('express');
const router = express.Router();
const {
  getReportSyncs,
  getReportStatuses,
  updateReportSyncStatus,
  syncAllToFirebase
} = require('../controllers/manager.controller');

router.get('/report-syncs', getReportSyncs);
router.put('/report-syncs/:id/status', updateReportSyncStatus);
router.get('/report-statuses', getReportStatuses);
router.post('/sync-all-to-firebase', syncAllToFirebase);

module.exports = router;
