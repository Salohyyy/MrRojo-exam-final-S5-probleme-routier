/**
 * Modèle UserDevice - Gestion des tokens FCM des appareils utilisateurs
 * 
 * Table : user_devices(id, user_id, fcm_token, device_info, created_at, updated_at)
 * Un utilisateur peut avoir plusieurs appareils (plusieurs tokens FCM).
 */

const pool = require('../config/database');

/**
 * Enregistre ou met à jour un token FCM pour un utilisateur.
 * Si le token existe déjà, on met à jour le user_id associé (cas de changement de compte).
 * 
 * @param {string} userId - Firebase UID de l'utilisateur
 * @param {string} fcmToken - Token FCM de l'appareil
 * @param {string} [deviceInfo] - Information optionnelle sur l'appareil
 * @returns {object} L'enregistrement créé ou mis à jour
 */
async function registerToken(userId, fcmToken, deviceInfo = null) {
  const result = await pool.query(
    `INSERT INTO user_devices (user_id, fcm_token, device_info)
     VALUES ($1, $2, $3)
     ON CONFLICT (fcm_token) 
     DO UPDATE SET user_id = $1, device_info = $3, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, fcmToken, deviceInfo]
  );
  return result.rows[0];
}

/**
 * Récupère tous les tokens FCM d'un utilisateur.
 * 
 * @param {string} userId - Firebase UID de l'utilisateur
 * @returns {string[]} Liste des tokens FCM
 */
async function getTokensByUserId(userId) {
  const result = await pool.query(
    'SELECT fcm_token FROM user_devices WHERE user_id = $1',
    [userId]
  );
  return result.rows.map(row => row.fcm_token);
}

/**
 * Supprime un token FCM spécifique (ex: token invalide).
 * 
 * @param {string} fcmToken - Token FCM à supprimer
 * @returns {boolean} true si supprimé, false sinon
 */
async function removeToken(fcmToken) {
  const result = await pool.query(
    'DELETE FROM user_devices WHERE fcm_token = $1',
    [fcmToken]
  );
  return result.rowCount > 0;
}

/**
 * Supprime plusieurs tokens FCM invalides en batch.
 * 
 * @param {string[]} tokens - Liste des tokens à supprimer
 * @returns {number} Nombre de tokens supprimés
 */
async function removeTokens(tokens) {
  if (!tokens || tokens.length === 0) return 0;
  const result = await pool.query(
    'DELETE FROM user_devices WHERE fcm_token = ANY($1)',
    [tokens]
  );
  return result.rowCount;
}

/**
 * Supprime tous les tokens d'un utilisateur (ex: lors de la déconnexion).
 * 
 * @param {string} userId - Firebase UID de l'utilisateur
 * @returns {number} Nombre de tokens supprimés
 */
async function removeAllTokensForUser(userId) {
  const result = await pool.query(
    'DELETE FROM user_devices WHERE user_id = $1',
    [userId]
  );
  return result.rowCount;
}

/**
 * Initialise la table user_devices si elle n'existe pas.
 * Ajoute aussi firebase_uid à la table users si manquant.
 * Utile pour la migration sans redémarrage complet.
 */
async function ensureTable() {
  // Créer la table user_devices
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_devices (
      id BIGSERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      fcm_token TEXT NOT NULL UNIQUE,
      device_info VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_user_devices_fcm_token ON user_devices(fcm_token)');

  // Ajouter firebase_uid à la table users si elle n'existe pas
  const colCheck = await pool.query(`
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'firebase_uid'
  `);
  if (colCheck.rows.length === 0) {
    await pool.query('ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(255) UNIQUE');
    console.log('✓ Colonne firebase_uid ajoutée à la table users');
  }
}

module.exports = {
  registerToken,
  getTokensByUserId,
  removeToken,
  removeTokens,
  removeAllTokensForUser,
  ensureTable
};
