const pool = require('../config/database');
const { auth } = require('../config/firebase');

// Obtenir les paramètres globaux
async function getSettings(req, res) {
  try {
    const result = await pool.query('SELECT * FROM auth_settings LIMIT 1');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur getSettings:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Modifier la durée des sessions (en minutes)
async function updateSessionDuration(req, res) {
  const { minutes } = req.body;

  if (!minutes || minutes < 1 || minutes > 1440) {
    return res.status(400).json({ 
      error: 'Durée invalide (doit être entre 1 et 1440 minutes = 24h)' 
    });
  }

  try {
    const result = await pool.query(
      'UPDATE auth_settings SET session_duration_minutes = $1 RETURNING *',
      [minutes]
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

// Modifier le nombre max de tentatives par défaut
async function updateDefaultMaxAttempts(req, res) {
  const { attempts } = req.body;

  if (!attempts || attempts < 1 || attempts > 10) {
    return res.status(400).json({ 
      error: 'Nombre de tentatives invalide (doit être entre 1 et 10)' 
    });
  }

  try {
    const result = await pool.query(
      'UPDATE auth_settings SET default_max_login_attempts = $1 RETURNING *',
      [attempts]
    );
    res.json({ 
      success: true, 
      settings: result.rows[0] 
    });
  } catch (error) {
    console.error('Erreur updateDefaultMaxAttempts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Liste des utilisateurs Firebase non encore synchronisés
async function getUnsyncedFirebaseUsers(req, res) {
  try {
    // Récupérer tous les utilisateurs Firebase
    const listUsersResult = await auth.listUsers();
    const firebaseUsers = listUsersResult.users;

    // Récupérer les utilisateurs déjà synchronisés
    const syncedResult = await pool.query(
      'SELECT firebase_uid, email, max_login_attempts, is_synced_to_local, local_user_id FROM user_auth_settings'
    );
    const syncedMap = new Map(syncedResult.rows.map(u => [u.firebase_uid, u]));

    // Filtrer pour obtenir les non synchronisés
    const users = firebaseUsers.map(fbUser => {
      const localData = syncedMap.get(fbUser.uid);
      return {
        firebase_uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        createdAt: fbUser.metadata.creationTime,
        lastSignIn: fbUser.metadata.lastSignInTime,
        isSyncedToLocal: localData?.is_synced_to_local || false,
        localUserId: localData?.local_user_id || null,
        maxLoginAttempts: localData?.max_login_attempts || null,
        hasSettings: !!localData
      };
    });

    res.json(users);
  } catch (error) {
    console.error('Erreur getUnsyncedFirebaseUsers:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Synchroniser un utilisateur Firebase vers la base locale
async function syncFirebaseUserToLocal(req, res) {
  const { firebase_uid } = req.params;
  const { username, birth_date, user_status_id } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Récupérer l'utilisateur Firebase
    const fbUser = await auth.getUser(firebase_uid);

    // Vérifier si l'utilisateur existe déjà dans users
    const existingUser = await client.query(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [firebase_uid]
    );

    let localUserId;

    if (existingUser.rows.length > 0) {
      localUserId = existingUser.rows[0].id;
    } else {
      // Créer l'utilisateur dans la table users
      const insertResult = await client.query(
        `INSERT INTO users (firebase_uid, username, email, birth_date, user_status_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          firebase_uid,
          username || fbUser.displayName || fbUser.email.split('@')[0],
          fbUser.email,
          birth_date || null,
          user_status_id || 1 // Par défaut: active
        ]
      );
      localUserId = insertResult.rows[0].id;
    }

    // Mettre à jour user_auth_settings
    await client.query(
      `INSERT INTO user_auth_settings (firebase_uid, email, is_synced_to_local, local_user_id)
       VALUES ($1, $2, TRUE, $3)
       ON CONFLICT (firebase_uid)
       DO UPDATE SET is_synced_to_local = TRUE, local_user_id = $3`,
      [firebase_uid, fbUser.email, localUserId]
    );

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      localUserId,
      message: 'Utilisateur synchronisé avec succès' 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur syncFirebaseUserToLocal:', error);
    res.status(500).json({ error: 'Erreur lors de la synchronisation' });
  } finally {
    client.release();
  }
}

// Synchroniser tous les utilisateurs Firebase
async function syncAllFirebaseUsers(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const listUsersResult = await auth.listUsers();
    const firebaseUsers = listUsersResult.users;

    let syncedCount = 0;
    const errors = [];

    for (const fbUser of firebaseUsers) {
      try {
        // Vérifier si déjà synchronisé
        const existing = await client.query(
          'SELECT id FROM users WHERE firebase_uid = $1',
          [fbUser.uid]
        );

        if (existing.rows.length === 0) {
          // Créer l'utilisateur
          const insertResult = await client.query(
            `INSERT INTO users (firebase_uid, username, email, user_status_id)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [
              fbUser.uid,
              fbUser.displayName || fbUser.email.split('@')[0],
              fbUser.email,
              1 // active
            ]
          );

          // Mettre à jour user_auth_settings
          await client.query(
            `INSERT INTO user_auth_settings (firebase_uid, email, is_synced_to_local, local_user_id)
             VALUES ($1, $2, TRUE, $3)
             ON CONFLICT (firebase_uid)
             DO UPDATE SET is_synced_to_local = TRUE, local_user_id = $3`,
            [fbUser.uid, fbUser.email, insertResult.rows[0].id]
          );

          syncedCount++;
        }
      } catch (err) {
        errors.push({ email: fbUser.email, error: err.message });
      }
    }

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      syncedCount,
      totalUsers: firebaseUsers.length,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur syncAllFirebaseUsers:', error);
    res.status(500).json({ error: 'Erreur lors de la synchronisation' });
  } finally {
    client.release();
  }
}

// Modifier le nombre de tentatives pour un utilisateur spécifique
async function updateUserMaxAttempts(req, res) {
  const { firebase_uid } = req.params;
  const { max_attempts } = req.body;

  if (max_attempts !== null && (max_attempts < 1 || max_attempts > 10)) {
    return res.status(400).json({ 
      error: 'Nombre de tentatives invalide (doit être entre 1 et 10, ou null pour utiliser la valeur par défaut)' 
    });
  }

  try {
    // Récupérer l'utilisateur Firebase pour vérifier qu'il existe
    const fbUser = await auth.getUser(firebase_uid);

    // Mettre à jour ou créer les paramètres utilisateur
    const result = await pool.query(
      `INSERT INTO user_auth_settings (firebase_uid, email, max_login_attempts)
       VALUES ($1, $2, $3)
       ON CONFLICT (firebase_uid)
       DO UPDATE SET max_login_attempts = $3
       RETURNING *`,
      [firebase_uid, fbUser.email, max_attempts]
    );

    res.json({ 
      success: true, 
      settings: result.rows[0] 
    });
  } catch (error) {
    console.error('Erreur updateUserMaxAttempts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Liste des utilisateurs bloqués
async function getBlockedUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT firebase_uid, email, failed_attempts, blocked_at 
       FROM login_attempts 
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
  const { firebase_uid } = req.params;

  try {
    const result = await pool.query(
      `UPDATE login_attempts 
       SET is_blocked = FALSE, 
           failed_attempts = 0, 
           blocked_at = NULL 
       WHERE firebase_uid = $1 
       RETURNING *`,
      [firebase_uid]
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

module.exports = {
  getSettings,
  updateSessionDuration,
  updateDefaultMaxAttempts,
  getUnsyncedFirebaseUsers,
  syncFirebaseUserToLocal,
  syncAllFirebaseUsers,
  updateUserMaxAttempts,
  getBlockedUsers,
  unblockUser
};