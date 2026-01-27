const express = require('express');
const router = express.Router();
const { verifyEmployeeToken } = require('../middleware/auth');
const {
  loginEmployee,
  verifyEmployeeToken: verifyToken
} = require('../controllers/employeeAuthController');

router.post('/login', loginEmployee);
router.get('/verify', verifyEmployeeToken, verifyToken);

module.exports = router;