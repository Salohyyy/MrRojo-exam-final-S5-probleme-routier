const firebaseSettings = require('../services/firebaseSettings');

async function getSettings(req, res) {
  try {
    const settings = await firebaseSettings.getGlobalSettings();
    res.json(settings);
  } catch (error) {
    console.error('Erreur getSettings:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function updateSessionDuration(req, res) {
  const { minutes } = req.body;

  if (!minutes || minutes < 1 || minutes > 1440) {
    return res.status(400).json({
      error: 'Durée invalide (1-1440 minutes)'
    });
  }

  try {
    const settings = await firebaseSettings.updateSessionDuration(minutes);
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Erreur updateSessionDuration:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function updateDefaultMaxAttempts(req, res) {
  const { attempts } = req.body;

  if (!attempts || attempts < 1 || attempts > 10) {
    return res.status(400).json({
      error: 'Nombre invalide (1-10)'
    });
  }

  try {
    const settings = await firebaseSettings.updateDefaultMaxAttempts(attempts);
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Erreur updateDefaultMaxAttempts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function getAllFirebaseUsers(req, res) {
  try {
    const users = await firebaseSettings.getAllFirebaseUsersWithSettings();
    res.json(users);
  } catch (error) {
    console.error('Erreur getAllFirebaseUsers:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function updateUserMaxAttempts(req, res) {
  const { uid } = req.params;
  const { max_attempts } = req.body;

  if (max_attempts !== null && (max_attempts < 1 || max_attempts > 10)) {
    return res.status(400).json({
      error: 'Nombre invalide (1-10 ou null)'
    });
  }

  try {
    const settings = await firebaseSettings.setUserMaxAttempts(uid, max_attempts);
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Erreur updateUserMaxAttempts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function getBlockedUsers(req, res) {
  try {
    const users = await firebaseSettings.getBlockedUsers();
    res.json(users);
  } catch (error) {
    console.error('Erreur getBlockedUsers:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function unblockUser(req, res) {
  const { uid } = req.params;

  try {
    const result = await firebaseSettings.unblockUser(uid);
    res.json({
      success: true,
      loginAttempts: result
    });
  } catch (error) {
    console.error('Erreur unblockUser:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  getSettings,
  updateSessionDuration,
  updateDefaultMaxAttempts,
  getAllFirebaseUsers,
  updateUserMaxAttempts,
  getBlockedUsers,
  unblockUser
};