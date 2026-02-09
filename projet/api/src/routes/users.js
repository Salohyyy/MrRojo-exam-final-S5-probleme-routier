const express = require('express');
const router = express.Router();
const { verifyAnyToken } = require('../middleware/auth');
const {
  getAllLocalUsers,
  getUnsyncedUsers,
  createLocalUser,
  syncUserToFirebase,
  syncMultipleUsersToFirebase
} = require('../controllers/userController');

// Toutes les routes nécessitent une authentification (employé ou Firebase)
router.get('/', verifyAnyToken, getAllLocalUsers);
router.get('/unsynced', verifyAnyToken, getUnsyncedUsers);
router.post('/', verifyAnyToken, createLocalUser);
router.post('/:id/sync', verifyAnyToken, syncUserToFirebase);
router.post('/sync-multiple', verifyAnyToken, syncMultipleUsersToFirebase);

module.exports = router;
