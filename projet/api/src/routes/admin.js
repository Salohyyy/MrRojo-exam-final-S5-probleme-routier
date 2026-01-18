const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, requireAdmin } = require('../middleware/auth');
const {
  getSettings,
  updateSessionDuration,
  updateMaxAttempts,
  getBlockedUsers,
  unblockUser,
  getAllUsers,
  updateUserMaxAttempts
} = require('../controllers/adminController');

// Toutes les routes admin nécessitent authentification + rôle admin
router.use(verifyFirebaseToken);
router.use(requireAdmin);

// Paramètres
router.get('/settings', getSettings);
router.put('/settings/session-duration', updateSessionDuration);
router.put('/settings/max-attempts', updateMaxAttempts);

// Gestion des utilisateurs
router.get('/users', getAllUsers);
router.get('/users/blocked', getBlockedUsers);
router.post('/users/:uid/unblock', unblockUser);
router.put('/users/:uid/max-attempts', updateUserMaxAttempts);

module.exports = router;