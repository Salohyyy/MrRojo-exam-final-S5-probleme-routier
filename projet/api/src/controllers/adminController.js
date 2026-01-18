const pool = require('../config/database');

// Obtenir les paramètres actuels
async function getSettings(req, res) {
  try {
    const result = await pool.query('SELECT * FROM session_settings LIMIT 1');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur getSettings:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Modifier la durée de vie des sessions
async function updateSessionDuration(req, res) {
  const { hours } = req.body;

  if (!hours || hours < 1 || hours > 720) {
    return res.status(400).json({ 
      error: 'Durée invalide (doit être entre 1 et 720 heures)' 
    });
  }

  try {
    const result = await pool.query(
      'UPDATE session_settings SET session_duration_hours = $1 RETURNING *',
      [hours]
    );
    res.json({ 
      success: true, 
      settings: result.rows[0] 
    });
  } catch (error) {
    console.error('Erreur updateSessionDuration:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Modifier le nombre max de tentatives
async function updateMaxAttempts(req, res) {
  const { attempts } = req.body;

  if (!attempts || attempts < 1 || attempts > 10) {
    return res.status(400).json({ 
      error: 'Nombre de tentatives invalide (doit être entre 1 et 10)' 
    });
  }

  try {
    const result = await pool.query(
      'UPDATE session_settings SET max_login_attempts = $1 RETURNING *',
      [attempts]
    );
    res.json({ 
      success: true, 
      settings: result.rows[0] 
    });
  } catch (error) {
    console.error('Erreur updateMaxAttempts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Obtenir la liste des utilisateurs bloqués
async function getBlockedUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT uid, email, failed_attempts, blocked_at 
       FROM user_auth_tracking 
       WHERE is_blocked = TRUE 
       ORDER BY blocked_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur getBlockedUsers:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Débloquer un utilisateur
async function unblockUser(req, res) {
  const { uid } = req.params;

  try {
    const result = await pool.query(
      `UPDATE user_auth_tracking 
       SET is_blocked = FALSE, 
           failed_attempts = 0, 
           blocked_at = NULL 
       WHERE uid = $1 
       RETURNING *`,
      [uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ 
      success: true, 
      user: result.rows[0] 
    });
  } catch (error) {
    console.error('Erreur unblockUser:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Obtenir tous les utilisateurs avec leur statut
async function getAllUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT uid, email, failed_attempts, custom_max_attempts, is_blocked, 
              blocked_at, last_attempt_at, created_at
       FROM user_auth_tracking 
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur getAllUsers:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Modifier le nombre de tentatives pour un utilisateur spécifique
async function updateUserMaxAttempts(req, res) {
  const { uid } = req.params;
  const { attempts } = req.body;

  // Si attempts est null, on réinitialise au paramètre global
  if (attempts !== null && (attempts < 1 || attempts > 10)) {
    return res.status(400).json({ 
      error: 'Nombre de tentatives invalide (doit être entre 1 et 10, ou null pour réinitialiser)' 
    });
  }

  try {
    const result = await pool.query(
      `UPDATE user_auth_tracking 
       SET custom_max_attempts = $1
       WHERE uid = $2
       RETURNING *`,
      [attempts, uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ 
      success: true, 
      user: result.rows[0],
      message: attempts === null 
        ? 'Nombre de tentatives réinitialisé au paramètre global'
        : `Nombre de tentatives personnalisé défini à ${attempts}`
    });
  } catch (error) {
    console.error('Erreur updateUserMaxAttempts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  getSettings,
  updateSessionDuration,
  updateMaxAttempts,
  getBlockedUsers,
  unblockUser,
  getAllUsers,
  updateUserMaxAttempts
};