const pool = require('../config/database');
const { auth } = require('../config/firebase');

// Vérifier les tentatives de connexion
async function checkLoginAttempts(req, res) {
  const { email } = req.body;

  try {
    // Récupérer l'utilisateur Firebase par email
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;

    // Récupérer les paramètres globaux
    const settings = await pool.query('SELECT max_login_attempts FROM session_settings LIMIT 1');
    const globalMaxAttempts = settings.rows[0].max_login_attempts;

    // Vérifier le tracking de l'utilisateur
    const result = await pool.query(
      'SELECT failed_attempts, is_blocked, custom_max_attempts FROM user_auth_tracking WHERE uid = $1',
      [uid]
    );

    if (result.rows.length === 0) {
      // Créer l'entrée si elle n'existe pas
      await pool.query(
        'INSERT INTO user_auth_tracking (uid, email) VALUES ($1, $2)',
        [uid, email]
      );
      return res.json({ canLogin: true, attemptsLeft: globalMaxAttempts });
    }

    const user = result.rows[0];

    if (user.is_blocked) {
      return res.status(403).json({ 
        canLogin: false, 
        error: 'Compte bloqué suite à trop de tentatives échouées' 
      });
    }

    // Utiliser custom_max_attempts si défini, sinon le global
    const maxAttempts = user.custom_max_attempts || globalMaxAttempts;
    const attemptsLeft = maxAttempts - user.failed_attempts;
    
    res.json({ 
      canLogin: true, 
      attemptsLeft,
      maxAttempts,
      isCustom: user.custom_max_attempts !== null
    });

  } catch (error) {
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

    // Récupérer les paramètres et les infos utilisateur
    const settings = await pool.query('SELECT max_login_attempts FROM session_settings LIMIT 1');
    const globalMaxAttempts = settings.rows[0].max_login_attempts;

    const userResult = await pool.query(
      'SELECT custom_max_attempts FROM user_auth_tracking WHERE uid = $1',
      [uid]
    );

    // Déterminer le max attempts à utiliser
    const maxAttempts = userResult.rows[0]?.custom_max_attempts || globalMaxAttempts;

    // Incrémenter le compteur
    const result = await pool.query(
      `UPDATE user_auth_tracking 
       SET failed_attempts = failed_attempts + 1, 
           last_attempt_at = CURRENT_TIMESTAMP
       WHERE uid = $1
       RETURNING failed_attempts`,
      [uid]
    );

    const failedAttempts = result.rows[0].failed_attempts;

    // Bloquer si limite atteinte
    if (failedAttempts >= maxAttempts) {
      await pool.query(
        `UPDATE user_auth_tracking 
         SET is_blocked = TRUE, blocked_at = CURRENT_TIMESTAMP 
         WHERE uid = $1`,
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
  const { uid } = req.user;

  try {
    // Réinitialiser le compteur
    await pool.query(
      'UPDATE user_auth_tracking SET failed_attempts = 0 WHERE uid = $1',
      [uid]
    );

    // Créer une session
    const settings = await pool.query('SELECT session_duration_hours FROM session_settings LIMIT 1');
    const durationHours = settings.rows[0].session_duration_hours;

    const sessionToken = req.headers.authorization.split('Bearer ')[1];
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO user_sessions (uid, session_token, expires_at) 
       VALUES ($1, $2, $3)`,
      [uid, sessionToken, expiresAt]
    );

    res.json({ 
      success: true, 
      sessionExpiresAt: expiresAt 
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