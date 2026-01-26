const express = require('express');
const router = express.Router();
const {
  getAllReports,
  getAllReportsFromPostgres,
  getReportById,
  getReportsByCity,
  getReportSyncs
} = require('../controllers/visitorReportsController');

router.get('/', getAllReports);
router.get('/postgres', getAllReportsFromPostgres);
router.get('/syncs', getReportSyncs);
router.get('/:id', getReportById);
router.get('/city/:city', getReportsByCity);

module.exports = router;
