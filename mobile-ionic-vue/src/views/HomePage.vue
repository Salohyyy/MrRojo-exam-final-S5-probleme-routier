<template>
  <ion-page>
    <ion-header class="modern-header">
      <ion-toolbar class="toolbar-airbnb">
        <ion-title class="title-airbnb">
          <span class="logo-icon">🚧</span>
          Suivi des Travaux
        </ion-title>
        <ion-buttons slot="end">
          <!-- Bouton Actualiser -->
          <ion-button @click="refreshData" class="auth-button">
            <ion-icon slot="icon-only" :icon="refreshOutline"></ion-icon>
          </ion-button>
          <!-- Cloche de notifications (visible si connecté) -->
          <ion-button v-if="isAuthenticated" @click="toggleNotifications" class="auth-button notif-bell">
            <ion-icon slot="icon-only" :icon="notificationsOutline"></ion-icon>
            <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount }}</span>
          </ion-button>
          <ion-button v-if="!isAuthenticated" @click="goToLogin" class="auth-button">
            <ion-icon slot="icon-only" :icon="logInOutline"></ion-icon>
          </ion-button>
          <ion-button v-else @click="handleLogout" class="auth-button">
            <ion-icon slot="icon-only" :icon="logOutOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="content-airbnb">
      <!-- Panneau de notifications -->
      <div v-if="showNotifications" class="notifications-panel">
        <div class="notif-panel-header">
          <span class="notif-panel-title">🔔 Notifications</span>
          <ion-button fill="clear" size="small" @click="showNotifications = false">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </div>
        <div v-if="notifications.length === 0" class="notif-empty">
          <p>Aucune notification</p>
          <p class="notif-hint" v-if="isListening">Vous serez notifié lorsqu'un signalement sera mis à jour</p>
        </div>
        <div v-else class="notif-list">
          <div
            v-for="notif in notifications"
            :key="notif.id"
            class="notif-item"
            :class="{ 'notif-unread': !notif.read }"
          >
            <div class="notif-item-title">{{ notif.title }}</div>
            <div class="notif-item-body">{{ notif.body }}</div>
            <div class="notif-item-time">{{ formatTime(notif.timestamp) }}</div>
          </div>
        </div>
        <div v-if="notifications.length > 0" class="notif-panel-footer">
          <ion-button fill="clear" size="small" @click="clearNotifications">
            Tout effacer
          </ion-button>
        </div>
      </div>

      <!-- Segment pour basculer entre les vues -->
      <div class="segment-container">
        <ion-segment :value="currentView" @ionChange="handleViewChange">
          <ion-segment-button value="map">
            <ion-icon :icon="mapOutline"></ion-icon>
            <ion-label>Carte</ion-label>
          </ion-segment-button>
          <ion-segment-button value="stats">
            <ion-icon :icon="statsChartOutline"></ion-icon>
            <ion-label>Statistiques</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>

      <!-- Vue Carte -->
      <div v-show="currentView === 'map'" class="map-view">
        <div id="map" class="map-modern"></div>
        
        <!-- Légende de la carte -->
        <div class="map-legend">
          <div class="legend-header">
            <span class="legend-title">Types de problèmes</span>
          </div>
          <div class="legend-items">
            <div class="legend-item">
              <span class="legend-icon">🕳️</span>
              <span class="legend-marker" style="background-color: #FF385C;"></span>
              <span class="legend-label">Nid de poule</span>
            </div>
            <div class="legend-item">
              <span class="legend-icon">🚧</span>
              <span class="legend-marker" style="background-color: #FC642D;"></span>
              <span class="legend-label">Chaussée dégradée</span>
            </div>
            <div class="legend-item">
              <span class="legend-icon">💡</span>
              <span class="legend-marker" style="background-color: #FFDB58;"></span>
              <span class="legend-label">Lampadaires</span>
            </div>
            <div class="legend-item">
              <span class="legend-icon">⚡</span>
              <span class="legend-marker" style="background-color: #00A699;"></span>
              <span class="legend-label">Fissure</span>
            </div>
            <div class="legend-item">
              <span class="legend-icon">⛰️</span>
              <span class="legend-marker" style="background-color: #008080;"></span>
              <span class="legend-label">Glissement</span>
            </div>
            <div class="legend-item">
              <span class="legend-icon">💧</span>
              <span class="legend-marker" style="background-color: #4285F4;"></span>
              <span class="legend-label">Inondation</span>
            </div>
          </div>
        </div>

        <div class="quick-stats">
          <div class="quick-stat-item">
            <span class="stat-number">{{ totalItems }}</span>
            <span class="stat-label">Projets</span>
          </div>
          <div class="quick-stat-divider"></div>
          <div class="quick-stat-item">
            <span class="stat-number">{{ avgProgress.toFixed(0) }}%</span>
            <span class="stat-label">Progression</span>
          </div>
          <div class="quick-stat-divider"></div>
          <div class="quick-stat-item">
            <span class="stat-number">{{ totalTermines }}</span>
            <span class="stat-label">Terminés</span>
          </div>
        </div>
      </div>

      <!-- Vue Statistiques -->
      <div v-show="currentView === 'stats'" class="stats-view">
        <!-- Filtre Tous / Mes Signalements -->
        <div v-if="isAuthenticated" class="filter-bar">
          <ion-button 
            :fill="filterMode === 'all' ? 'solid' : 'outline'" 
            size="small" 
            @click="handleFilter('all')"
            class="filter-btn"
          >
            <ion-icon slot="start" :icon="listOutline"></ion-icon>
            Tous
          </ion-button>
          <ion-button 
            :fill="filterMode === 'mine' ? 'solid' : 'outline'" 
            size="small" 
            @click="handleFilter('mine')"
            class="filter-btn"
          >
            <ion-icon slot="start" :icon="personOutline"></ion-icon>
            Mes signalements
          </ion-button>
        </div>
        <div class="stats-grid">
          <div class="stat-card primary">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-value">{{ totalItems }}</div>
              <div class="stat-label">Projets affichés</div>
            </div>
          </div>
          <div class="stat-card success">
            <div class="stat-icon">💰</div>
            <div class="stat-content">
              <div class="stat-value">{{ formatMoney(totalBudget) }}</div>
              <div class="stat-label">Budget total</div>
            </div>
          </div>
          <div class="stat-card warning">
            <div class="stat-icon">📈</div>
            <div class="stat-content">
              <div class="stat-value">{{ avgProgress.toFixed(1) }}%</div>
              <div class="stat-label">Progression moyenne</div>
            </div>
          </div>
          <div class="stat-card completed">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-value">{{ totalTermines }}</div>
              <div class="stat-label">Projets terminés</div>
            </div>
          </div>
        </div>

        <!-- Liste des projets -->
        <div class="projects-section">
          <h2 class="section-title">Détails des projets</h2>
          <div class="projects-list">
            <div v-for="item in displayedItems" :key="item.id" class="project-card">
              <div class="project-header">
                <div class="project-location">
                  <span class="problem-icon-card">{{ getProblemIcon(item.problem_type_id) }}</span>
                  <ion-icon :icon="locationOutline" class="location-icon"></ion-icon>
                  <span class="city-name">{{ item.city }}</span>
                </div>
                <div class="progress-badge" :style="{ backgroundColor: getProgressColor(item.progress) }">
                  {{ item.progress }}%
                </div>
              </div>
              <div class="project-company">{{ item.company_name }}</div>
              <div class="project-footer">
                <span class="budget">{{ formatMoney(item.budget) }}</span>
                <span class="status-badge">Statut: {{ item.report_status_id }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de signalement -->
      <ion-modal :is-open="showModal" @didDismiss="closeModal" class="report-modal">
        <ion-header>
          <ion-toolbar class="modal-toolbar">
            <ion-title>Nouveau signalement</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeModal">
                <ion-icon :icon="closeOutline"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="modal-content">
          <div class="modal-body">
            <div class="location-info">
              <ion-icon :icon="locationOutline" class="loc-icon"></ion-icon>
              <div class="coordinates">
                <span>{{ clickedLat?.toFixed(5) }}, {{ clickedLng?.toFixed(5) }}</span>
              </div>
            </div>

            <div class="form-section">
              <ion-item lines="none" class="input-item">
                <ion-label position="stacked" class="input-label">Ville</ion-label>
                <ion-input v-model="city" placeholder="Détection automatique..." readonly class="input-field"></ion-input>
              </ion-item>

              <ion-item lines="none" class="input-item">
                <ion-label position="stacked" class="input-label">Type de problème</ion-label>
                <ion-select v-model="problemTypeId" interface="action-sheet" class="select-field">
                  <ion-select-option :value="1">🕳️ Nid de poule</ion-select-option>
                  <ion-select-option :value="2">🚧 Chaussée dégradée</ion-select-option>
                  <ion-select-option :value="4">⚡ Fissure</ion-select-option>
                  <ion-select-option :value="5">⛰️ Glissement</ion-select-option>
                  <ion-select-option :value="6">💧 Inondation</ion-select-option>
                </ion-select>
              </ion-item>
            </div>

            <!-- Photos Section -->
            <div class="photos-section">
              <div class="photo-header">
                <ion-label class="input-label">Photos ({{ selectedPhotos.length }})</ion-label>
              </div>

              <div class="photo-buttons">
                <ion-button 
                  expand="block" 
                  fill="outline" 
                  @click="takePhoto" 
                  :disabled="uploadingPhotos || selectedPhotos.length >= 3"
                  class="photo-btn"
                >
                  <ion-icon slot="start" :icon="cameraOutline"></ion-icon>
                  📸 Prendre une photo
                </ion-button>
                <ion-button 
                  expand="block" 
                  fill="outline" 
                  @click="pickPhoto" 
                  :disabled="uploadingPhotos || selectedPhotos.length >= 3"
                  class="photo-btn"
                >
                  <ion-icon slot="start" :icon="imagesOutline"></ion-icon>
                  🖼️ Choisir depuis galerie
                </ion-button>
              </div>

              <div class="photo-grid" v-if="selectedPhotos.length > 0">
                <div v-for="(photo, index) in selectedPhotos" :key="index" class="photo-item">
                  <img :src="photo.dataUrl" alt="Photo" />
                  <ion-button 
                    fill="clear" 
                    size="small" 
                    class="remove-photo-btn"
                    @click="removePhoto(index)"
                    :disabled="uploadingPhotos"
                  >
                    <ion-icon slot="icon-only" :icon="closeCircle"></ion-icon>
                  </ion-button>
                </div>
              </div>

              <div class="photo-info" v-if="selectedPhotos.length === 0">
                <ion-icon :icon="imagesOutline" class="info-icon"></ion-icon>
                <p>Aucune photo ajoutée</p>
                <p class="photo-hint">Ajoutez jusqu'à 10 photos</p>
              </div>
            </div>

            <div class="modal-actions">
              <ion-button expand="block" fill="clear" @click="closeModal" class="cancel-btn" :disabled="uploadingPhotos">
                Annuler
              </ion-button>
              <ion-button expand="block" @click="submitReport" class="submit-btn" :disabled="uploadingPhotos">
                {{ uploadingPhotos ? 'Upload en cours...' : 'Enregistrer' }}
              </ion-button>
            </div>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonModal, IonButton, IonInput, IonSelect, IonSelectOption, IonButtons, IonIcon, IonSegment, IonSegmentButton, alertController } from '@ionic/vue';
import { logInOutline, logOutOutline, mapOutline, statsChartOutline, locationOutline, closeOutline, cameraOutline, imagesOutline, closeCircle, notificationsOutline, personOutline, listOutline, refreshOutline } from 'ionicons/icons';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useReports } from '../composables/useReports';
import { useMap } from '../composables/useMap';
import { useReportForm } from '../composables/useReportForm';
import { useAuth } from '../composables/useAuth';
import { useNotifications } from '../composables/useNotifications';
import { formatMoney } from '../utils/formatters';
import { COLORS } from '../constants/theme.constants';
import { PROBLEM_STYLES, DEFAULT_STYLE } from '../constants/map.constants';

const router = useRouter();
const currentView = ref('map');

// Utilisation des composables
const { displayedItems, totalItems, totalBudget, avgProgress, totalTermines, filterMode, loadReports, loadMyReports, setFilter } = useReports();
const { currentUser, isAuthenticated, logout } = useAuth();
const { initializeMap, reloadMarkers, onMapClick } = useMap('map');
const { 
  showModal, 
  city, 
  problemTypeId, 
  userId, 
  clickedLat, 
  clickedLng, 
  selectedPhotos,
  uploadingPhotos,
  openModal, 
  closeModal, 
  submitReport,
  takePhoto,
  pickPhoto,
  removePhoto
} = useReportForm();

async function handleFilter(mode: 'all' | 'mine') {
  setFilter(mode);
  if (mode === 'mine' && currentUser.value) {
    await loadMyReports(currentUser.value.uid);
  }
}
const { notifications, unreadCount, isListening, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
const showNotifications = ref(false);

function toggleNotifications() {
  showNotifications.value = !showNotifications.value;
  if (showNotifications.value) {
    markAllAsRead();
  }
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

async function handleMapClick(lat: number, lng: number) {
  if (!isAuthenticated.value) {
    const alert = await alertController.create({
      header: 'Connexion requise',
      message: 'Vous devez vous connecter pour signaler un problème routier.',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Se connecter',
          handler: () => {
            router.push('/login');
          }
        }
      ]
    });
    await alert.present();
  } else {
    openModal(lat, lng);
  }
}

function goToLogin() {
  router.push('/login');
}

async function handleLogout() {
  const alert = await alertController.create({
    header: 'Déconnexion',
    message: 'Êtes-vous sûr de vouloir vous déconnecter ?',
    buttons: [
      {
        text: 'Annuler',
        role: 'cancel'
      },
      {
        text: 'Déconnexion',
        handler: async () => {
          await logout();
        }
      }
    ]
  });
  await alert.present();
}

function handleViewChange(event: CustomEvent) {
  currentView.value = event.detail.value;
}

function getProgressColor(progress: number): string {
  if (progress >= 100) return COLORS.success;
  if (progress >= 75) return COLORS.babu;
  if (progress >= 50) return COLORS.yellow;
  if (progress >= 25) return COLORS.arches;
  return COLORS.primary;
}

function getProblemIcon(problemTypeId?: string | number): string {
  if (!problemTypeId) return DEFAULT_STYLE.icon || '⚠️';
  const style = PROBLEM_STYLES[String(problemTypeId)];
  return style?.icon || DEFAULT_STYLE.icon || '⚠️';
}

async function refreshData() {
  await loadReports();
  await reloadMarkers();
}

onMounted(async () => {
  await loadReports();
  await initializeMap();
  onMapClick((lat, lng) => handleMapClick(lat, lng));
});
</script>

<style scoped>
/* Header Airbnb */
.modern-header {
  box-shadow: 0 1px 0 rgba(0,0,0,0.08);
}

.toolbar-airbnb {
  --background: #FFFFFF;
  --color: #222222;
  --padding-top: 8px;
  --padding-bottom: 8px;
}

.title-airbnb {
  font-size: 18px;
  font-weight: 700;
  color: #222222;
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 24px;
}

.auth-button {
  --color: #FF385C;
}

/* Content */
.content-airbnb {
  --background: #F7F7F7;
}

/* Segment */
.segment-container {
  background: #FFFFFF;
  padding: 12px 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.08);
}

ion-segment {
  --background: #F7F7F7;
  border-radius: 8px;
  padding: 4px;
}

ion-segment-button {
  --color: #767676;
  --color-checked: #222222;
  --indicator-color: #FFFFFF;
  --indicator-box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  min-height: 40px;
  font-weight: 600;
  font-size: 14px;
}

/* Map View */
.map-view {
  position: relative;
  height: calc(100vh - 140px);
}

.map-modern {
  height: 100%;
  width: 100%;
  z-index: 0;
}

/* Légende de la carte */
.map-legend {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 1000;
  max-width: 160px;
}

.legend-header {
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #EBEBEB;
}

.legend-title {
  font-size: 10px;
  font-weight: 700;
  color: #222222;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-icon {
  font-size: 12px;
  line-height: 1;
}

.legend-marker {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid #FFFFFF;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.legend-label {
  font-size: 10px;
  color: #484848;
  font-weight: 500;
  line-height: 1.2;
}

.quick-stats {
  position: absolute;
  bottom: 20px;
  left: 16px;
  right: 16px;
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  z-index: 1000;
}

.quick-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #222222;
}

.stat-label {
  font-size: 12px;
  color: #767676;
  font-weight: 500;
}

.quick-stat-divider {
  width: 1px;
  height: 40px;
  background: #EBEBEB;
}

/* Stats View */
.stats-view {
  padding: 16px;
  overflow-y: auto;
  height: calc(100vh - 140px);
}

/* Filter Bar */
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.filter-btn {
  --border-radius: 20px;
  --padding-start: 14px;
  --padding-end: 14px;
  font-size: 13px;
  font-weight: 600;
  text-transform: none;
  --background: #FF385C;
  --color: #fff;
  --border-color: #FF385C;
}

.filter-btn[fill="outline"] {
  --background: transparent;
  --color: #FF385C;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:active {
  transform: scale(0.98);
}

.stat-card.primary {
  border-left: 4px solid #FF385C;
}

.stat-card.success {
  border-left: 4px solid #00A699;
}

.stat-card.warning {
  border-left: 4px solid #FC642D;
}

.stat-card.completed {
  border-left: 4px solid #00A699;
}

.stat-icon {
  font-size: 32px;
  line-height: 1;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #222222;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #767676;
  font-weight: 500;
}

/* Projects Section */
.projects-section {
  margin-top: 8px;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #222222;
  margin-bottom: 16px;
  padding-left: 4px;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}

.project-card:active {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.project-location {
  display: flex;
  align-items: center;
  gap: 6px;
}

.problem-icon-card {
  font-size: 20px;
  line-height: 1;
}

.location-icon {
  color: #FF385C;
  font-size: 18px;
}

.city-name {
  font-size: 16px;
  font-weight: 600;
  color: #222222;
}

.progress-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  color: #FFFFFF;
}

.project-company {
  font-size: 14px;
  color: #767676;
  margin-bottom: 12px;
}

.project-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #EBEBEB;
}

.budget {
  font-size: 15px;
  font-weight: 600;
  color: #00A699;
}

.status-badge {
  font-size: 12px;
  color: #767676;
  background: #F7F7F7;
  padding: 4px 10px;
  border-radius: 8px;
}

/* Modal */
.report-modal {
  --height: 90%;
  --min-height: 500px;
  --border-radius: 20px 20px 0 0;
  --background: #FFFFFF !important;
}

.report-modal ion-content {
  --background: #F7F7F7 !important;
}

.modal-toolbar {
  --background: #FFFFFF !important;
  --color: #222222 !important;
  background: #FFFFFF !important;
}

.modal-content {
  --background: #F7F7F7 !important;
  background: #F7F7F7 !important;
}

.modal-body {
  padding: 20px;
  background: #F7F7F7;
  min-height: 400px;
}

.location-info {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.loc-icon {
  font-size: 24px;
  color: #FF385C;
}

.coordinates {
  font-size: 14px;
  color: #767676;
  font-family: monospace;
}

.form-section {
  background: #FFFFFF !important;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  display: block !important;
  visibility: visible !important;
}

.input-item {
  --padding-start: 0;
  --inner-padding-end: 0;
  --background: transparent;
  margin-bottom: 16px;
  display: block !important;
  visibility: visible !important;
}

.input-item ion-input,
.input-item ion-select {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}

.input-label {
  font-size: 14px;
  font-weight: 600;
  color: #222222 !important;
  margin-bottom: 8px;
  display: block !important;
}

.input-field,
.select-field {
  --background: #F7F7F7 !important;
  --padding-start: 12px;
  --padding-end: 12px;
  border-radius: 8px;
  font-size: 15px;
  color: #222222 !important;
  background: #F7F7F7 !important;
  min-height: 44px !important;
}

/* Photos Section */
.photos-section {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.photo-header {
  margin-bottom: 12px;
}

.photo-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.photo-btn {
  flex: 1;
  --border-color: #FF385C;
  --color: #FF385C;
  --border-width: 2px;
  text-transform: none;
  font-weight: 600;
  font-size: 14px;
  height: 44px;
}

.photo-btn:hover {
  --background: rgba(255, 56, 92, 0.05);
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.photo-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #F7F7F7;
}

.photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-photo-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  --background: rgba(255, 255, 255, 0.9);
  --color: #FF385C;
  --border-radius: 50%;
  width: 28px;
  height: 28px;
  margin: 0;
}

.photo-info {
  text-align: center;
  padding: 24px;
  color: #717171;
}

.photo-info .info-icon {
  font-size: 48px;
  margin-bottom: 8px;
  opacity: 0.3;
}

.photo-info p {
  margin: 0;
  font-size: 14px;
}

.photo-hint {
  font-size: 12px;
  color: #B0B0B0;
  margin-top: 4px !important;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.cancel-btn {
  --color: #767676;
  font-weight: 600;
}

.submit-btn {
  --background: #FF385C;
  --background-hover: #FF5A5F;
  --background-activated: #E31C5F;
  --color: #FFFFFF;
  font-weight: 700;
  border-radius: 8px;
  height: 48px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .map-legend {
    top: 8px;
    right: 8px;
    max-width: 140px;
    padding: 6px;
  }
  
  .legend-title {
    font-size: 9px;
  }
  
  .legend-icon {
    font-size: 11px;
  }
  
  .legend-label {
    font-size: 9px;
  }
  
  .legend-marker {
    width: 7px;
    height: 7px;
  }
  
  .legend-items {
    gap: 3px;
  }
}

/* ── Notification Bell & Panel ── */
.notif-bell {
  position: relative;
}

.notif-badge {
  position: absolute;
  top: 4px;
  right: 2px;
  background: #FF385C;
  color: white;
  font-size: 10px;
  font-weight: 700;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  pointer-events: none;
}

.notifications-panel {
  position: relative;
  z-index: 100;
  background: white;
  border-bottom: 1px solid #E8E8E8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  max-height: 320px;
  overflow-y: auto;
}

.notif-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 4px;
  border-bottom: 1px solid #F0F0F0;
}

.notif-panel-title {
  font-weight: 700;
  font-size: 16px;
}

.notif-empty {
  text-align: center;
  padding: 24px 16px;
  color: #767676;
}

.notif-empty p {
  margin: 0;
  font-size: 14px;
}

.notif-hint {
  font-size: 12px;
  color: #B0B0B0;
  margin-top: 4px !important;
}

.notif-list {
  padding: 0;
}

.notif-item {
  padding: 12px 16px;
  border-bottom: 1px solid #F5F5F5;
  transition: background-color 0.2s;
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-unread {
  background-color: #FFF5F6;
  border-left: 3px solid #FF385C;
}

.notif-item-title {
  font-weight: 600;
  font-size: 13px;
  color: #222;
  margin-bottom: 2px;
}

.notif-item-body {
  font-size: 12px;
  color: #555;
  line-height: 1.4;
}

.notif-item-time {
  font-size: 11px;
  color: #B0B0B0;
  margin-top: 4px;
}

.notif-panel-footer {
  text-align: center;
  padding: 4px;
  border-top: 1px solid #F0F0F0;
}
</style>
