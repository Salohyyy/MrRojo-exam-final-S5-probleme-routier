const pool = require('../config/database');
const { auth } = require('../config/firebase');

// Récupérer tous les users locaux
async function getAllLocalUsers(req, res) {
  try {
    const result = await pool.query(`
      SELECT u.id, u.firebase_uid, u.username, u.email, u.password, u.birth_date, 
             u.user_status_id, u.created_at, us.name as status_name
      FROM users u
      JOIN user_statuses us ON u.user_status_id = us.id
      ORDER BY u.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur getAllLocalUsers:', error);
    res.status(500).json({ error: error.message });
  }
}

// Récupérer les users non synchronisés (sans firebase_uid)
async function getUnsyncedUsers(req, res) {
  try {
    const result = await pool.query(`
      SELECT u.id, u.firebase_uid, u.username, u.email, u.password, u.birth_date,
             u.user_status_id, u.created_at, us.name as status_name
      FROM users u
      JOIN user_statuses us ON u.user_status_id = us.id
      WHERE u.firebase_uid IS NULL
      ORDER BY u.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur getUnsyncedUsers:', error);
    res.status(500).json({ error: error.message });
  }
}

// Créer un user local
async function createLocalUser(req, res) {
  try {
    const { username, email, password, birth_date } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe sont requis' });
    }

    // Vérifier si l'email existe déjà
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' });
    }

    // user_status_id = 1 (active) par défaut
    const result = await pool.query(
      `INSERT INTO users (username, email, password, birth_date, user_status_id)
       VALUES ($1, $2, $3, $4, 1) RETURNING *`,
      [username || null, email, password, birth_date || null]
    );

    const user = result.rows[0];

    // Récupérer le status_name
    const statusResult = await pool.query('SELECT name FROM user_statuses WHERE id = $1', [user.user_status_id]);
    user.status_name = statusResult.rows[0]?.name || 'active';

    res.status(201).json(user);
  } catch (error) {
    console.error('Erreur createLocalUser:', error);
    res.status(500).json({ error: error.message });
  }
}

// Synchroniser un user vers Firebase Auth
async function syncUserToFirebase(req, res) {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Récupérer le user local
    const userResult = await client.query(
      'SELECT id, email, password, username, firebase_uid FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = userResult.rows[0];

    if (user.firebase_uid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Utilisateur déjà synchronisé avec Firebase' });
    }

    if (!user.email || !user.password) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Email et mot de passe requis pour la synchronisation Firebase' });
    }

    // Créer l'utilisateur dans Firebase Auth
    const firebaseUserData = {
      email: user.email,
      password: user.password,
    };

    if (user.username) {
      firebaseUserData.displayName = user.username;
    }

    const firebaseUser = await auth.createUser(firebaseUserData);

    // Mettre à jour le firebase_uid dans la base locale
    await client.query(
      'UPDATE users SET firebase_uid = $1 WHERE id = $2',
      [firebaseUser.uid, id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Utilisateur synchronisé avec Firebase',
      firebase_uid: firebaseUser.uid,
      user_id: parseInt(id)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur syncUserToFirebase:', error);

    // Gérer les erreurs Firebase spécifiques
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Cet email existe déjà dans Firebase' });
    }
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({ error: 'Email invalide' });
    }
    if (error.code === 'auth/weak-password') {
      return res.status(400).json({ error: 'Mot de passe trop faible (min 6 caractères)' });
    }

    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}

// Synchroniser plusieurs users vers Firebase Auth
async function syncMultipleUsersToFirebase(req, res) {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'Liste d\'identifiants utilisateurs requise' });
  }

  const results = {
    success: [],
    errors: []
  };

  for (const userId of userIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        'SELECT id, email, password, username, firebase_uid FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        results.errors.push({ id: userId, error: 'Utilisateur non trouvé' });
        await client.query('ROLLBACK');
        continue;
      }

      const user = userResult.rows[0];

      if (user.firebase_uid) {
        results.errors.push({ id: userId, error: 'Déjà synchronisé' });
        await client.query('ROLLBACK');
        continue;
      }

      if (!user.email || !user.password) {
        results.errors.push({ id: userId, error: 'Email/mot de passe manquant' });
        await client.query('ROLLBACK');
        continue;
      }

      const firebaseUserData = {
        email: user.email,
        password: user.password,
      };

      if (user.username) {
        firebaseUserData.displayName = user.username;
      }

      const firebaseUser = await auth.createUser(firebaseUserData);

      await client.query(
        'UPDATE users SET firebase_uid = $1 WHERE id = $2',
        [firebaseUser.uid, userId]
      );

      await client.query('COMMIT');

      results.success.push({
        id: userId,
        email: user.email,
        firebase_uid: firebaseUser.uid
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Erreur sync user ${userId}:`, error);
      results.errors.push({
        id: userId,
        error: error.code === 'auth/email-already-exists'
          ? 'Email déjà existant dans Firebase'
          : error.message
      });
    } finally {
      client.release();
    }
  }

  res.json({
    message: `${results.success.length} synchronisé(s), ${results.errors.length} erreur(s)`,
    ...results
  });
}

module.exports = {
  getAllLocalUsers,
  getUnsyncedUsers,
  createLocalUser,
  syncUserToFirebase,
  syncMultipleUsersToFirebase
};
