/**
 * Routes de Notifications Push
 * 
 * POST   /api/notifications/register       - Enregistrer un token FCM
 * DELETE /api/notifications/unregister      - Supprimer un token FCM
 * DELETE /api/notifications/unregister-all  - Supprimer tous les tokens d'un utilisateur
 * 
 * Toutes les routes nécessitent une authentification Firebase.
 */

const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const {
  registerToken,
  unregisterToken,
  unregisterAllTokens
} = require('../controllers/notificationController');

// Enregistrer un token FCM (appelé après login côté mobile)
router.post('/register', verifyFirebaseToken, registerToken);

// Supprimer un token FCM spécifique (appelé lors du logout)
router.delete('/unregister', verifyFirebaseToken, unregisterToken);

// Supprimer tous les tokens d'un utilisateur
router.delete('/unregister-all', verifyFirebaseToken, unregisterAllTokens);

module.exports = router;
