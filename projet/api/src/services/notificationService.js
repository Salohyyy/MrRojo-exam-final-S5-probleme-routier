/**
 * Service de Notifications Push via Firebase Cloud Messaging (FCM)
 * 
 * Responsabilités :
 * - Envoyer des notifications push à un ou plusieurs appareils
 * - Gérer les tokens invalides (suppression automatique)
 * - Notifier le propriétaire d'un signalement lors d'un changement de statut
 */

const { admin } = require('../config/firebase');
const userDeviceModel = require('../models/userDeviceModel');
const pool = require('../config/database');

/**
 * Envoie une notification push à une liste de tokens FCM.
 * Gère automatiquement la suppression des tokens invalides.
 * 
 * @param {string[]} tokens - Liste de tokens FCM cibles
 * @param {string} title - Titre de la notification
 * @param {string} body - Corps de la notification
 * @param {object} [data] - Données supplémentaires envoyées avec la notification
 * @returns {object} Résultat de l'envoi { successCount, failureCount, invalidTokens }
 */
async function sendToTokens(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) {
    console.log('⚠️ Aucun token FCM fourni, notification non envoyée');
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  // Construire le message multicast FCM
  const message = {
    notification: {
      title,
      body
    },
    data: {
      ...data,
      // Convertir toutes les valeurs en string (requis par FCM)
      ...(Object.fromEntries(
        Object.entries(data).map(([key, val]) => [key, String(val)])
      ))
    },
    tokens
  };

  try {
    // Envoi multicast à tous les appareils
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`📬 Notifications envoyées: ${response.successCount} succès, ${response.failureCount} échecs`);

    // Identifier et supprimer les tokens invalides
    const invalidTokens = [];
    response.responses.forEach((resp, index) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        console.error(`❌ Erreur envoi au token ${index}:`, errorCode, resp.error?.message);

        // Tokens invalides ou expirés à supprimer
        if (
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/registration-token-not-registered' ||
          errorCode === 'messaging/invalid-argument'
        ) {
          invalidTokens.push(tokens[index]);
        }
      }
    });

    // Supprimer les tokens invalides de la base
    if (invalidTokens.length > 0) {
      const removedCount = await userDeviceModel.removeTokens(invalidTokens);
      console.log(`🗑️ ${removedCount} token(s) invalide(s) supprimé(s)`);
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens
    };
  } catch (error) {
    console.error('❌ Erreur envoi notification FCM:', error);
    throw error;
  }
}

/**
 * Envoie une notification push à un utilisateur (tous ses appareils).
 * 
 * @param {string} userId - Firebase UID de l'utilisateur cible
 * @param {string} title - Titre de la notification
 * @param {string} body - Corps de la notification
 * @param {object} [data] - Données supplémentaires
 * @returns {object} Résultat de l'envoi
 */
async function sendToUser(userId, title, body, data = {}) {
  const tokens = await userDeviceModel.getTokensByUserId(userId);

  if (tokens.length === 0) {
    console.log(`⚠️ Aucun appareil enregistré pour l'utilisateur ${userId}`);
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  console.log(`📱 Envoi notification à l'utilisateur ${userId} (${tokens.length} appareil(s))`);
  return sendToTokens(tokens, title, body, data);
}

/**
 * Notifie le propriétaire d'un signalement lors d'un changement de statut.
 * C'est la fonction principale appelée lors de la mise à jour d'un report.
 * 
 * @param {number} reportId - ID du signalement dans PostgreSQL
 * @param {number} newStatusId - Nouveau statut du signalement
 * @returns {object|null} Résultat de l'envoi ou null si pas d'utilisateur trouvé
 */
async function notifyReportStatusChange(reportId, newStatusId) {
  try {
    // 1. Récupérer le propriétaire du signalement et le nom du statut
    const result = await pool.query(
      `SELECT r.user_id, u.username, rs.name as status_name
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN report_statuses rs ON rs.id = $2
       WHERE r.id = $1`,
      [reportId, newStatusId]
    );

    if (result.rows.length === 0) {
      console.log(`⚠️ Signalement ${reportId} non trouvé`);
      return null;
    }

    const report = result.rows[0];
    const userId = report.user_id;
    const statusName = report.status_name || 'mis à jour';

    if (!userId) {
      console.log(`⚠️ Pas d'utilisateur associé au signalement ${reportId}`);
      return null;
    }

    // 2. Chercher le Firebase UID de l'utilisateur
    // L'user_id dans reports référence la table users (id PostgreSQL)
    // On doit trouver le Firebase UID correspondant
    const userResult = await pool.query(
      'SELECT firebase_uid FROM users WHERE id = $1',
      [userId]
    );

    let firebaseUid;
    if (userResult.rows.length > 0 && userResult.rows[0].firebase_uid) {
      firebaseUid = userResult.rows[0].firebase_uid;
    } else {
      // Fallback: l'user_id pourrait déjà être un Firebase UID (string)
      firebaseUid = String(userId);
    }

    // 3. Envoyer la notification
    const title = '📍 Mise à jour de votre signalement';
    const body = `Votre signalement #${reportId} est maintenant "${statusName}"`;
    const data = {
      type: 'report_status_change',
      reportId: String(reportId),
      newStatusId: String(newStatusId),
      statusName: statusName
    };

    return await sendToUser(firebaseUid, title, body, data);
  } catch (error) {
    // Ne pas faire échouer l'opération principale si la notification échoue
    console.error('❌ Erreur notification changement de statut:', error);
    return null;
  }
}

module.exports = {
  sendToTokens,
  sendToUser,
  notifyReportStatusChange
};
