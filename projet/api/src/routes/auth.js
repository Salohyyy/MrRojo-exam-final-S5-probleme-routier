const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const {
  checkLoginAttempts,
  recordFailedAttempt,
  recordSuccessfulLogin,
  checkSession
} = require('../controllers/authController');

// Routes publiques
router.post('/check-attempts', checkLoginAttempts);
router.post('/failed-attempt', recordFailedAttempt);

// Routes protégées
router.post('/successful-login', verifyFirebaseToken, recordSuccessfulLogin);
router.get('/check-session', verifyFirebaseToken, checkSession);

module.exports = router;