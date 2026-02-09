/**
 * Service de Notifications Push pour le mobile
 * 
 * Utilise @capacitor/push-notifications pour :
 * - Demander l'autorisation de notifications
 * - Récupérer le token FCM
 * - Écouter les notifications reçues (foreground et background)
 * - Enregistrer/supprimer le token auprès du backend
 */

import { PushNotifications, PushNotificationSchema, ActionPerformed, Token } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { auth } from '../config/firebase';

// URL de l'API backend
const API_URL = 'http://10.0.2.2:4000'; // Android emulator -> localhost
// Pour appareil physique, utiliser l'IP locale du PC: 'http://192.168.x.x:4000'

/**
 * Récupère le token Bearer Firebase de l'utilisateur courant
 */
async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

/**
 * Enregistre un token FCM auprès du backend
 */
async function registerTokenOnBackend(fcmToken: string): Promise<boolean> {
  try {
    const authToken = await getAuthToken();
    if (!authToken) {
      console.error('[Notifications] Utilisateur non authentifié');
      return false;
    }

    const response = await fetch(`${API_URL}/api/notifications/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        fcmToken,
        deviceInfo: `${Capacitor.getPlatform()} - ${navigator.userAgent.slice(0, 50)}`
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Notifications] Erreur enregistrement token:', error);
      return false;
    }

    console.log('[Notifications] Token FCM enregistré sur le backend');
    return true;
  } catch (error) {
    console.error('[Notifications] Erreur réseau enregistrement token:', error);
    return false;
  }
}

/**
 * Supprime un token FCM du backend (lors du logout)
 */
async function unregisterTokenOnBackend(fcmToken: string): Promise<boolean> {
  try {
    const authToken = await getAuthToken();
    if (!authToken) return false;

    const response = await fetch(`${API_URL}/api/notifications/unregister`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ fcmToken })
    });

    return response.ok;
  } catch (error) {
    console.error('[Notifications] Erreur suppression token:', error);
    return false;
  }
}

export const notificationService = {
  registerTokenOnBackend,
  unregisterTokenOnBackend,
  getAuthToken
};
