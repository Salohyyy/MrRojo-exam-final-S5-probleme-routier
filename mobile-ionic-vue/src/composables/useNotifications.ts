/**
 * Composable useNotifications
 * 
 * ══════════════════════════════════════════════════════════════
 * SYSTÈME DE NOTIFICATIONS LOCALES BASÉ SUR FIRESTORE TEMPS RÉEL
 * ══════════════════════════════════════════════════════════════
 * 
 * Architecture simple (sans backend, sans FCM) :
 * 
 *   Firestore (onSnapshot) ──► Détection changement statut ──► Notification locale
 * 
 * Fonctionnement :
 * 1. Après le login, on démarre un listener onSnapshot sur la collection "reports"
 *    filtré par user_id = utilisateur connecté
 * 2. Au PREMIER chargement, on stocke les statuts actuels sans notifier (éviter les faux positifs)
 * 3. Pour chaque modification détectée ensuite :
 *    - On compare l'ancien statut (en cache) avec le nouveau
 *    - Si le statut a changé → notification locale
 *    - On met à jour le cache
 * 4. Au logout, on arrête le listener et on vide le cache
 * 
 * Usage :
 *   const { startListening, stopListening, notifications } = useNotifications();
 *   // Après login :
 *   startListening(user.uid);
 *   // Au logout :
 *   stopListening();
 */

import { ref, computed } from 'vue';
import {
  collection,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
  type DocumentChange
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  requestNotificationPermission,
  showLocalNotification,
  setupNotificationListeners
} from '../services/notification.service';

// ─── Types ───────────────────────────────────────────────────

/** Représente une notification affichée à l'utilisateur */
interface NotificationItem {
  id: string;
  title: string;
  body: string;
  reportId: string;
  timestamp: Date;
  read: boolean;
}

/** Mapping des IDs de statut vers des libellés lisibles */
const STATUS_LABELS: Record<string, string> = {
  '1': 'En attente',
  '2': 'Signalé',
  '3': 'En cours de traitement',
  '4': 'En cours de réparation',
  '5': 'Terminé',
  '6': 'Rejeté'
};

/**
 * Retourne le libellé lisible d'un statut
 */
function getStatusLabel(statusId: string | number): string {
  return STATUS_LABELS[String(statusId)] || `Statut ${statusId}`;
}

// ─── État partagé (singleton) ────────────────────────────────

/** Cache des statuts : reportId → dernier report_status_id connu */
const statusCache = ref<Map<string, string>>(new Map());

/** Historique des notifications affichées */
const notifications = ref<NotificationItem[]>([]);

/** Indique si le listener est actif */
const isListening = ref(false);

/** Nombre de notifications non lues */
const unreadCount = computed(() =>
  notifications.value.filter(n => !n.read).length
);

/** Flag pour ignorer le premier snapshot (chargement initial) */
let isFirstSnapshot = true;

/** Référence vers la fonction de désinscription du listener */
let unsubscribe: Unsubscribe | null = null;

// ─── Composable ──────────────────────────────────────────────

export function useNotifications() {

  /**
   * Démarre l'écoute en temps réel des signalements de l'utilisateur.
   * Appeler cette fonction APRÈS un login réussi.
   * 
   * @param userId - Firebase UID de l'utilisateur connecté
   */
  async function startListening(userId: string): Promise<void> {
    // Éviter les doublons de listeners
    if (isListening.value) {
      console.log('[Notifications] Listener déjà actif');
      return;
    }

    // Demander la permission de notifications
    await requestNotificationPermission();
    setupNotificationListeners();

    // Reset de l'état
    isFirstSnapshot = true;
    statusCache.value.clear();

    console.log(`[Notifications] Démarrage écoute pour l'utilisateur: ${userId}`);

    // ────────────────────────────────────────────────────────
    // LISTENER FIRESTORE onSnapshot
    // Écoute la collection "reports" filtrée par user_id
    // ────────────────────────────────────────────────────────
    const reportsQuery = query(
      collection(db, 'reports'),
      where('user_id', '==', userId)
    );

    unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      // ╔══════════════════════════════════════════════════════╗
      // ║ PREMIER SNAPSHOT = chargement initial                ║
      // ║ On stocke les statuts actuels SANS notifier          ║
      // ║ pour éviter les fausses notifications                ║
      // ╚══════════════════════════════════════════════════════╝
      if (isFirstSnapshot) {
        console.log(`[Notifications] Chargement initial: ${snapshot.docs.length} signalement(s)`);

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const statusId = String(data.report_status_id || '');
          statusCache.value.set(doc.id, statusId);
        });

        isFirstSnapshot = false;
        isListening.value = true;
        console.log('[Notifications] Cache initialisé, écoute active ✅');
        return; // NE PAS notifier au premier chargement
      }

      // ╔══════════════════════════════════════════════════════╗
      // ║ SNAPSHOTS SUIVANTS = modifications en temps réel     ║
      // ║ On ne traite que les documents MODIFIÉS              ║
      // ╚══════════════════════════════════════════════════════╝
      snapshot.docChanges().forEach((change: DocumentChange) => {
        // On ignore les créations et suppressions
        if (change.type !== 'modified') return;

        const doc = change.doc;
        const data = doc.data();
        const newStatusId = String(data.report_status_id || '');
        const oldStatusId = statusCache.value.get(doc.id);

        // Vérifier si le statut a RÉELLEMENT changé
        if (oldStatusId !== undefined && oldStatusId !== newStatusId) {
          const city = data.city || 'Inconnu';
          const oldLabel = getStatusLabel(oldStatusId);
          const newLabel = getStatusLabel(newStatusId);

          console.log(
            `[Notifications] Changement détecté sur ${doc.id}: ` +
            `"${oldLabel}" → "${newLabel}"`
          );

          // Créer la notification
          const title = `📍 Signalement mis à jour`;
          const body = `Votre signalement à ${city} est passé de "${oldLabel}" à "${newLabel}"`;

          // Afficher la notification locale
          showLocalNotification(title, body, {
            reportId: doc.id,
            oldStatus: oldStatusId,
            newStatus: newStatusId
          });

          // Ajouter à l'historique des notifications
          notifications.value.unshift({
            id: `notif-${Date.now()}-${doc.id}`,
            title,
            body,
            reportId: doc.id,
            timestamp: new Date(),
            read: false
          });
        }

        // Mettre à jour le cache avec le nouveau statut
        statusCache.value.set(doc.id, newStatusId);
      });
    }, (error) => {
      console.error('[Notifications] Erreur listener Firestore:', error);
      isListening.value = false;
    });
  }

  /**
   * Arrête l'écoute en temps réel.
   * Appeler cette fonction AVANT ou PENDANT le logout.
   */
  function stopListening(): void {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
      console.log('[Notifications] Listener Firestore arrêté');
    }

    // Reset complet de l'état
    isListening.value = false;
    isFirstSnapshot = true;
    statusCache.value.clear();
    notifications.value = [];
  }

  /**
   * Marque une notification comme lue.
   */
  function markAsRead(notificationId: string): void {
    const notif = notifications.value.find(n => n.id === notificationId);
    if (notif) {
      notif.read = true;
    }
  }

  /**
   * Marque toutes les notifications comme lues.
   */
  function markAllAsRead(): void {
    notifications.value.forEach(n => { n.read = true; });
  }

  /**
   * Supprime toutes les notifications de l'historique.
   */
  function clearNotifications(): void {
    notifications.value = [];
  }

  return {
    // État réactif
    notifications,
    isListening,
    unreadCount,

    // Actions
    startListening,
    stopListening,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };
}
