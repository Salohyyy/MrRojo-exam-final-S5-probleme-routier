/**
 * Service de Notifications Locales
 * 
 * Utilise @capacitor/local-notifications pour afficher des notifications
 * sur l'appareil SANS backend, SANS FCM.
 * 
 * Les notifications sont déclenchées localement lorsqu'un changement
 * de statut est détecté via Firestore onSnapshot.
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Compteur pour générer des IDs uniques de notification
let notificationIdCounter = 1;

/**
 * Demande la permission d'afficher des notifications locales.
 * À appeler une fois au démarrage ou après le login.
 * 
 * @returns {boolean} true si la permission est accordée
 */
export async function requestNotificationPermission(): Promise<boolean> {
  // Sur le web (dev), pas de notifications natives
  if (!Capacitor.isNativePlatform()) {
    console.log('[Notifications] Mode web détecté — notifications simulées en console');
    return true;
  }

  try {
    // Vérifier les permissions actuelles
    let permStatus = await LocalNotifications.checkPermissions();

    if (permStatus.display === 'prompt') {
      // Demander la permission à l'utilisateur
      permStatus = await LocalNotifications.requestPermissions();
    }

    const granted = permStatus.display === 'granted';
    console.log('[Notifications] Permission:', granted ? 'accordée ✅' : 'refusée ❌');
    return granted;
  } catch (error) {
    console.error('[Notifications] Erreur demande permission:', error);
    return false;
  }
}

/**
 * Affiche une notification locale sur l'appareil.
 * 
 * @param title - Titre de la notification
 * @param body - Corps/contenu de la notification
 * @param data - Données supplémentaires (optionnel)
 */
export async function showLocalNotification(
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  // Mode web (dev) : afficher en console uniquement
  if (!Capacitor.isNativePlatform()) {
    console.log(`🔔 [Notification locale] ${title}: ${body}`);
    return;
  }

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationIdCounter++,
          title,
          body,
          // Notification immédiate
          schedule: { at: new Date(Date.now() + 500) },
          // Données extra accessibles lors du clic
          extra: data || {}
        }
      ]
    });
    console.log(`🔔 Notification locale affichée: ${title}`);
  } catch (error) {
    console.error('[Notifications] Erreur affichage notification:', error);
  }
}

/**
 * Configure le listener pour les clics sur les notifications.
 * Permet de naviguer vers un signalement quand l'utilisateur tape dessus.
 */
export function setupNotificationListeners(): void {
  if (!Capacitor.isNativePlatform()) return;

  LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    console.log('[Notifications] Clic sur notification:', action);
    const data = action.notification.extra;

    // On pourrait naviguer vers le détail du signalement ici
    if (data?.reportId) {
      console.log(`[Notifications] Signalement #${data.reportId} cliqué`);
    }
  });
}
