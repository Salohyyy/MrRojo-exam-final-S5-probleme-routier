const express = require('express');
const router = express.Router();
const {
  getAllReports,
  getReportById,
  getReportsByCity
} = require('../controllers/reports.controller');

router.get('/', getAllReports);
router.get('/:id', getReportById);
router.get('/city/:city', getReportsByCity);

module.exports = router;