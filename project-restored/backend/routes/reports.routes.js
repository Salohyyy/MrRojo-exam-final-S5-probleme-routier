const express = require('express');
const router = express.Router();
const {
  getAllReports,
  getAllReportsFromPostgres,
  getReportById,
  getReportsByCity
} = require('../controllers/reports.controller');

router.get('/', getAllReports);
router.get('/postgres', getAllReportsFromPostgres);
router.get('/:id', getReportById);
router.get('/city/:city', getReportsByCity);

module.exports = router;