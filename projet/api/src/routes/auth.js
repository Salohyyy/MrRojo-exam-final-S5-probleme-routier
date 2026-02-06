const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const {
  checkLoginAttempts,
  recordFailedAttempt,
  recordSuccessfulLogin
} = require('../controllers/authController');

router.post('/check-attempts', checkLoginAttempts);
router.post('/failed-attempt', recordFailedAttempt);
router.post('/successful-login', verifyFirebaseToken, recordSuccessfulLogin);

module.exports = router;