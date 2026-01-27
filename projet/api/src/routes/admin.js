const express = require('express');
const router = express.Router();
const { verifyEmployeeToken, requireAdmin } = require('../middleware/auth');
const {
  getSettings,
  updateSessionDuration,
  updateDefaultMaxAttempts,
  getAllFirebaseUsers,
  updateUserMaxAttempts,
  getBlockedUsers,
  unblockUser
} = require('../controllers/adminController');

router.use(verifyEmployeeToken);
router.use(requireAdmin);

router.get('/settings', getSettings);
router.put('/settings/session-duration', updateSessionDuration);
router.put('/settings/max-attempts', updateDefaultMaxAttempts);

router.get('/firebase-users', getAllFirebaseUsers);
router.put('/users/:uid/max-attempts', updateUserMaxAttempts);

router.get('/users/blocked', getBlockedUsers);
router.post('/users/:uid/unblock', unblockUser);

module.exports = router;