const pool = require('../config/database');
const { auth } = require('../config/firebase');

// Obtenir la durée de session et max tentatives
async function getAuthSettings() {
  const result = await pool.query('SELECT * FROM auth_settings LIMIT 1');
  return result.rows[0];
}

// Vérifier les tentatives de connexion
async function checkLoginAttempts(req, res) {
  const { email } = req.body;

  try {
    // Récupérer l'utilisateur Firebase par email
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;

    // Récupérer les paramètres utilisateur personnalisés
    const userSettings = await pool.query(
      'SELECT max_login_attempts FROM user_auth_settings WHERE firebase_uid = $1',
      [uid]
    );

    // Récupérer les paramètres globaux
    const globalSettings = await getAuthSettings();

    // Utiliser les paramètres personnalisés ou globaux
    const maxAttempts = userSettings.rows.length > 0 && userSettings.rows[0].max_login_attempts !== null
      ? userSettings.rows[0].max_login_attempts
      : globalSettings.default_max_login_attempts;

    // Vérifier le tracking de l'utilisateur
    const attempts = await pool.query(
      'SELECT failed_attempts, is_blocked FROM login_attempts WHERE firebase_uid = $1',
      [uid]
    );

    if (attempts.rows.length === 0) {
      // Créer l'entrée si elle n'existe pas
      await pool.query(
        'INSERT INTO login_attempts (firebase_uid, email) VALUES ($1, $2)',
        [uid, email]
      );
      return res.json({ canLogin: true, attemptsLeft: maxAttempts });
    }

    const user = attempts.rows[0];

    if (user.is_blocked) {
      return res.status(403).json({ 
        canLogin: false, 
        error: 'Compte bloqué suite à trop de tentatives échouées' 
      });
    }

    const attemptsLeft = maxAttempts - user.failed_attempts;
    res.json({ canLogin: true, attemptsLeft });

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'Utilisateur non trouvé dans Firebase' });
    }
    console.error('Erreur checkLoginAttempts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Enregistrer une tentative de connexion échouée
async function recordFailedAttempt(req, res) {
  const { email } = req.body;

  try {
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;

    // Récupérer les paramètres
    const userSettings = await pool.query(
      'SELECT max_login_attempts FROM user_auth_settings WHERE firebase_uid = $1',
      [uid]
    );
    const globalSettings = await getAuthSettings();
    const maxAttempts = userSettings.rows.length > 0 && userSettings.rows[0].max_login_attempts !== null
      ? userSettings.rows[0].max_login_attempts
      : globalSettings.default_max_login_attempts;

    // Incrémenter le compteur
    const result = await pool.query(
      `INSERT INTO login_attempts (firebase_uid, email, failed_attempts, last_attempt_at)
       VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
       ON CONFLICT (firebase_uid) 
       DO UPDATE SET 
         failed_attempts = login_attempts.failed_attempts + 1,
         last_attempt_at = CURRENT_TIMESTAMP
       RETURNING failed_attempts`,
      [uid, email]
    );

    const failedAttempts = result.rows[0].failed_attempts;

    // Bloquer si limite atteinte
    if (failedAttempts >= maxAttempts) {
      await pool.query(
        `UPDATE login_attempts 
         SET is_blocked = TRUE, blocked_at = CURRENT_TIMESTAMP 
         WHERE firebase_uid = $1`,
        [uid]
      );
      return res.json({ 
        blocked: true, 
        message: 'Compte bloqué suite à trop de tentatives échouées' 
      });
    }

    res.json({ 
      blocked: false, 
      attemptsLeft: maxAttempts - failedAttempts 
    });

  } catch (error) {
    console.error('Erreur recordFailedAttempt:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Réinitialiser le compteur après connexion réussie
async function recordSuccessfulLogin(req, res) {
  const { uid, email } = req.user;

  try {
    // Réinitialiser le compteur
    await pool.query(
      `INSERT INTO login_attempts (firebase_uid, email, failed_attempts)
       VALUES ($1, $2, 0)
       ON CONFLICT (firebase_uid)
       DO UPDATE SET failed_attempts = 0`,
      [uid, email]
    );

    // Créer/mettre à jour la session active
    const settings = await getAuthSettings();
    const expiresAt = new Date(Date.now() + settings.session_duration_minutes * 60 * 1000);

    await pool.query(
      `INSERT INTO active_sessions (firebase_uid, email, expires_at, last_activity_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id`,
      [uid, email, expiresAt]
    );

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

// Vérifier si la session est expirée
async function checkSession(req, res) {
  const { uid } = req.user;

  try {
    const result = await pool.query(
      `SELECT expires_at, last_activity_at 
       FROM active_sessions 
       WHERE firebase_uid = $1 AND is_active = TRUE 
       ORDER BY session_started_at DESC 
       LIMIT 1`,
      [uid]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ expired: true, message: 'Session non trouvée' });
    }

    const session = result.rows[0];
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (now > expiresAt) {
      // Marquer la session comme inactive
      await pool.query(
        `UPDATE active_sessions 
         SET is_active = FALSE 
         WHERE firebase_uid = $1 AND is_active = TRUE`,
        [uid]
      );
      return res.status(401).json({ expired: true, message: 'Session expirée' });
    }

    // Mettre à jour la dernière activité
    await pool.query(
      `UPDATE active_sessions 
       SET last_activity_at = CURRENT_TIMESTAMP 
       WHERE firebase_uid = $1 AND is_active = TRUE`,
      [uid]
    );

    res.json({ 
      expired: false, 
      expiresAt,
      remainingMinutes: Math.round((expiresAt - now) / 60000)
    });

  } catch (error) {
    console.error('Erreur checkSession:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  checkLoginAttempts,
  recordFailedAttempt,
  recordSuccessfulLogin,
  checkSession
};