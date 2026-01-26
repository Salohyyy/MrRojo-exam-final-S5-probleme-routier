const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/reports', reportController.getReports);
router.get('/report-syncs', reportController.getReportSyncs);
router.get('/report-statuses', reportController.getStatuses);
router.put('/reports/:id/status', reportController.updateReportStatus);
router.put('/report-syncs/:id/status', reportController.updateReportSyncStatus);
router.post('/sync-all-to-firebase', reportController.syncAllToFirebase);

module.exports = router;
