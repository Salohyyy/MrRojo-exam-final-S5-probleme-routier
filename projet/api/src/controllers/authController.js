const pool = require('../config/database');
const { auth } = require('../config/firebase');

// Vérifier les tentatives de connexion
async function checkLoginAttempts(req, res) {
  const { email } = req.body;

  try {
    // Récupérer l'utilisateur Firebase par email
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;

    // Récupérer les paramètres
    const settings = await pool.query('SELECT max_login_attempts FROM session_settings LIMIT 1');
    const maxAttempts = settings.rows[0].max_login_attempts;

    // Vérifier le tracking de l'utilisateur
    const result = await pool.query(
      'SELECT failed_attempts, is_blocked FROM user_auth_tracking WHERE uid = $1',
      [uid]
    );

    if (result.rows.length === 0) {
      // Créer l'entrée si elle n'existe pas
      await pool.query(
        'INSERT INTO user_auth_tracking (uid, email) VALUES ($1, $2)',
        [uid, email]
      );
      return res.json({ canLogin: true, attemptsLeft: maxAttempts });
    }

    const user = result.rows[0];

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
      // Si l'utilisateur n'existe pas, on permet "la tentative" (qui échouera via Firebase de toute façon)
      // sans vérifier la base de données locale
      return res.json({ canLogin: true, attemptsLeft: 3 }); 
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

    const settings = await pool.query('SELECT max_login_attempts FROM session_settings LIMIT 1');
    const maxAttempts = settings.rows[0].max_login_attempts;

    // Incrémenter le compteur
    const result = await pool.query(
      `UPDATE user_auth_tracking 
       SET failed_attempts = failed_attempts + 1, 
           last_attempt_at = CURRENT_TIMESTAMP
       WHERE uid = $1
       RETURNING failed_attempts`,
      [uid]
    );

    // Si l'utilisateur n'est pas encore suivi (ex: première tentative échouée après création manuelle)
    if (result.rows.length === 0) {
        // On l'ajoute au tracking
        await pool.query(
            'INSERT INTO user_auth_tracking (uid, email, failed_attempts, last_attempt_at) VALUES ($1, $2, 1, CURRENT_TIMESTAMP)',
            [uid, email]
        );
        return res.json({ 
            blocked: false, 
            attemptsLeft: maxAttempts - 1 
        });
    }

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
    if (error.code === 'auth/user-not-found') {
        return res.json({ 
            blocked: false, 
            attemptsLeft: 3 // Valeur par défaut si user inconnu
        });
    }
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