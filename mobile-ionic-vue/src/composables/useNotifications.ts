/**
 * Composable useNotifications
 * 
 * Gère l'ensemble du cycle de vie des notifications push :
 * 1. Vérification des permissions
 * 2. Demande d'autorisation
 * 3. Récupération du token FCM
 * 4. Envoi du token au backend
 * 5. Écoute des notifications (foreground et background)
 * 6. Nettoyage lors du logout
 * 
 * Usage :
 *   const { initNotifications, cleanupNotifications } = useNotifications();
 *   // Après login réussi :
 *   await initNotifications();
 *   // Lors du logout :
 *   await cleanupNotifications();
 */

import { ref } from 'vue';
import { PushNotifications, PushNotificationSchema, ActionPerformed, Token } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { notificationService } from '../services/notification.service';

// État partagé (singleton)
const fcmToken = ref<string | null>(null);
const notifications = ref<PushNotificationSchema[]>([]);
const isRegistered = ref(false);
const permissionGranted = ref(false);

export function useNotifications() {

  /**
   * Initialise les notifications push.
   * À appeler après un login Firebase réussi.
   */
  async function initNotifications(): Promise<boolean> {
    // Vérifier que l'on est bien sur un appareil natif
    if (!Capacitor.isNativePlatform()) {
      console.warn('[Notifications] Push non disponible sur le web, uniquement sur mobile natif');
      return false;
    }

    try {
      // 1. Vérifier/demander les permissions
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[Notifications] Permission refusée par l\'utilisateur');
        permissionGranted.value = false;
        return false;
      }

      permissionGranted.value = true;

      // 2. Configurer les listeners AVANT l'enregistrement
      setupListeners();

      // 3. S'enregistrer auprès d'APNs/FCM
      await PushNotifications.register();

      console.log('[Notifications] Enregistrement push initié');
      return true;
    } catch (error) {
      console.error('[Notifications] Erreur initialisation:', error);
      return false;
    }
  }

  /**
   * Configure les listeners pour les événements push.
   */
  function setupListeners() {
    // Succès de l'enregistrement : on reçoit le token FCM
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[Notifications] Token FCM reçu:', token.value);
      fcmToken.value = token.value;

      // Envoyer le token au backend
      const success = await notificationService.registerTokenOnBackend(token.value);
      isRegistered.value = success;

      if (success) {
        console.log('[Notifications] Token enregistré sur le backend ✅');
      } else {
        console.error('[Notifications] Échec enregistrement token sur le backend ❌');
      }
    });

    // Erreur d'enregistrement
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[Notifications] Erreur enregistrement:', error);
      isRegistered.value = false;
    });

    // Notification reçue quand l'app est au premier plan (foreground)
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[Notifications] Notification reçue (foreground):', notification);
      notifications.value.push(notification);

      // Optionnel : afficher un toast/alert Ionic pour les notifications foreground
      // car par défaut elles ne sont pas affichées dans la barre de notifications
    });

    // L'utilisateur a tapé sur une notification (app en background ou fermée)
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[Notifications] Action sur notification:', action);

      const data = action.notification.data;

      // Gérer la navigation selon le type de notification
      if (data?.type === 'report_status_change' && data?.reportId) {
        console.log(`[Notifications] Navigation vers le signalement #${data.reportId}`);
        // On pourrait utiliser le router ici pour naviguer vers le détail
        // router.push(`/report/${data.reportId}`);
      }
    });
  }

  /**
   * Nettoie les notifications lors du logout.
   * Supprime le token du backend et retire les listeners.
   */
  async function cleanupNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      // Supprimer le token du backend
      if (fcmToken.value) {
        await notificationService.unregisterTokenOnBackend(fcmToken.value);
      }

      // Nettoyer les listeners
      await PushNotifications.removeAllListeners();

      // Reset de l'état
      fcmToken.value = null;
      isRegistered.value = false;
      notifications.value = [];

      console.log('[Notifications] Nettoyage effectué');
    } catch (error) {
      console.error('[Notifications] Erreur nettoyage:', error);
    }
  }

  return {
    // État
    fcmToken,
    notifications,
    isRegistered,
    permissionGranted,

    // Actions
    initNotifications,
    cleanupNotifications
  };
}
