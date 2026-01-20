const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, requireAdmin } = require('../middleware/auth');
const {
  getSettings,
  updateSessionDuration,
  updateDefaultMaxAttempts,
  getUnsyncedFirebaseUsers,
  syncFirebaseUserToLocal,
  syncAllFirebaseUsers,
  updateUserMaxAttempts,
  getBlockedUsers,
  unblockUser
} = require('../controllers/adminController');

// Toutes les routes admin nécessitent authentification + rôle admin
router.use(verifyFirebaseToken);
router.use(requireAdmin);

// Paramètres globaux
router.get('/settings', getSettings);
router.put('/settings/session-duration', updateSessionDuration);
router.put('/settings/max-attempts', updateDefaultMaxAttempts);

// Gestion des utilisateurs Firebase
router.get('/firebase-users', getUnsyncedFirebaseUsers);
router.post('/firebase-users/:firebase_uid/sync', syncFirebaseUserToLocal);
router.post('/firebase-users/sync-all', syncAllFirebaseUsers);

// Paramètres utilisateur spécifique
router.put('/users/:firebase_uid/max-attempts', updateUserMaxAttempts);

// Gestion des blocages
router.get('/users/blocked', getBlockedUsers);
router.post('/users/:firebase_uid/unblock', unblockUser);

module.exports = router;