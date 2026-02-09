/**
 * Contrôleur de Notifications Push
 * 
 * Gère l'enregistrement et la désinscription des tokens FCM.
 * L'envoi de notifications est déclenché automatiquement par le backend
 * lors de la modification d'un signalement (pas par le mobile).
 */

const userDeviceModel = require('../models/userDeviceModel');

/**
 * POST /api/notifications/register
 * 
 * Enregistre un token FCM pour l'utilisateur authentifié.
 * Appelé par le mobile après un login réussi.
 * 
 * Body: { fcmToken: string, deviceInfo?: string }
 * Auth: Firebase Token (Bearer)
 */
async function registerToken(req, res) {
  try {
    const { fcmToken, deviceInfo } = req.body;

    // Validation
    if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.trim().length === 0) {
      return res.status(400).json({
        error: 'Token FCM requis',
        message: 'Le champ fcmToken est obligatoire et doit être une chaîne non vide'
      });
    }

    // L'utilisateur est identifié via le middleware verifyFirebaseToken
    const userId = req.user.uid;

    // Enregistrer ou mettre à jour le token
    const device = await userDeviceModel.registerToken(userId, fcmToken.trim(), deviceInfo || null);

    console.log(`✅ Token FCM enregistré pour l'utilisateur ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Token FCM enregistré avec succès',
      device: {
        id: device.id,
        userId: device.user_id,
        createdAt: device.created_at
      }
    });
  } catch (error) {
    console.error('❌ Erreur enregistrement token FCM:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Impossible d\'enregistrer le token FCM'
    });
  }
}

/**
 * DELETE /api/notifications/unregister
 * 
 * Supprime un token FCM (ex: lors de la déconnexion).
 * 
 * Body: { fcmToken: string }
 * Auth: Firebase Token (Bearer)
 */
async function unregisterToken(req, res) {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken || typeof fcmToken !== 'string') {
      return res.status(400).json({
        error: 'Token FCM requis',
        message: 'Le champ fcmToken est obligatoire'
      });
    }

    const removed = await userDeviceModel.removeToken(fcmToken.trim());

    if (removed) {
      console.log(`🗑️ Token FCM supprimé pour l'utilisateur ${req.user.uid}`);
      res.status(200).json({
        success: true,
        message: 'Token FCM supprimé avec succès'
      });
    } else {
      res.status(404).json({
        error: 'Token non trouvé',
        message: 'Ce token FCM n\'est pas enregistré'
      });
    }
  } catch (error) {
    console.error('❌ Erreur suppression token FCM:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Impossible de supprimer le token FCM'
    });
  }
}

/**
 * DELETE /api/notifications/unregister-all
 * 
 * Supprime tous les tokens FCM d'un utilisateur.
 * 
 * Auth: Firebase Token (Bearer)
 */
async function unregisterAllTokens(req, res) {
  try {
    const userId = req.user.uid;
    const count = await userDeviceModel.removeAllTokensForUser(userId);

    console.log(`🗑️ ${count} token(s) FCM supprimé(s) pour l'utilisateur ${userId}`);

    res.status(200).json({
      success: true,
      message: `${count} token(s) FCM supprimé(s)`,
      count
    });
  } catch (error) {
    console.error('❌ Erreur suppression tokens FCM:', error);
    res.status(500).json({
      error: 'Erreur serveur',
      message: 'Impossible de supprimer les tokens FCM'
    });
  }
}

module.exports = {
  registerToken,
  unregisterToken,
  unregisterAllTokens
};
