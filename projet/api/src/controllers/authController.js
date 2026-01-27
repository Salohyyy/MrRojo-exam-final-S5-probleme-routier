const { auth } = require('../config/firebase');
const firebaseSettings = require('../services/firebaseSettings');

async function checkLoginAttempts(req, res) {
  const { email } = req.body;

  try {
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;

    const attempts = await firebaseSettings.getLoginAttempts(uid);
    
    if (attempts.is_blocked) {
      return res.status(403).json({
        canLogin: false,
        error: 'Compte bloqué suite à trop de tentatives échouées'
      });
    }

    const maxAttempts = await firebaseSettings.getMaxAttemptsForUser(uid);
    const attemptsLeft = maxAttempts - attempts.failed_attempts;

    res.json({
      canLogin: true,
      attemptsLeft,
      maxAttempts
    });

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    console.error('Erreur checkLoginAttempts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function recordFailedAttempt(req, res) {
  const { email } = req.body;

  try {
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;

    const result = await firebaseSettings.recordFailedAttempt(uid, email);

    if (result.is_blocked) {
      return res.json({
        blocked: true,
        message: 'Compte bloqué suite à trop de tentatives échouées'
      });
    }

    res.json({
      blocked: false,
      attemptsLeft: result.attemptsLeft,
      failedAttempts: result.failed_attempts
    });

  } catch (error) {
    console.error('Erreur recordFailedAttempt:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function recordSuccessfulLogin(req, res) {
  const { uid } = req.user;

  try {
    await firebaseSettings.resetLoginAttempts(uid);

    const settings = await firebaseSettings.getGlobalSettings();
    const expiresAt = new Date(Date.now() + settings.session_duration_minutes * 60 * 1000);

    res.json({
      success: true,
      sessionExpiresAt: expiresAt,
      sessionDurationMinutes: settings.session_duration_minutes
    });

  } catch (error) {
    console.error('Erreur recordSuccessfulLogin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  checkLoginAttempts,
  recordFailedAttempt,
  recordSuccessfulLogin
};