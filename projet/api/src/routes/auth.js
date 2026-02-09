const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const {
  checkLoginAttempts,
  recordFailedAttempt,
  recordSuccessfulLogin
} = require('../controllers/authController');

// Vérifier si un utilisateur peut se connecter
router.post('/check-attempts', checkLoginAttempts);

// Enregistrer une tentative échouée
router.post('/failed-attempt', recordFailedAttempt);

// Enregistrer une connexion réussie (protégé)
router.post('/successful-login', verifyFirebaseToken, recordSuccessfulLogin);

module.exports = router;