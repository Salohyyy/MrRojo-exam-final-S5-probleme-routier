<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Suivi des Travaux</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div id="map" class="map"></div>
      <div class="stats">
        <div class="card">
          <div class="icon">📊</div>
          <div class="label">Affichés</div>
          <div class="value">{{ totalItems }}</div>
        </div>
        <div class="card">
          <div class="icon">💰</div>
          <div class="label">Budget Total</div>
          <div class="value">{{ formatMoney(totalBudget) }}</div>
        </div>
        <div class="card">
          <div class="icon">📈</div>
          <div class="label">Progression Moyenne</div>
          <div class="value">{{ avgProgress.toFixed(1) }}%</div>
        </div>
        <div class="card">
          <div class="icon">✅</div>
          <div class="label">Terminés</div>
          <div class="value">{{ totalTermines }}</div>
        </div>
      </div>
      <ion-list>
        <ion-item v-for="item in items" :key="item.id">
          <ion-label>
            <h2>{{ item.city }} • {{ item.company_name }}</h2>
            <p>Progression: {{ item.progress }}% • Statut: {{ item.report_status_id }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <ion-modal :is-open="showModal" @didDismiss="closeModal">
        <div class="modal">
          <h3>Ajouter un signalement</h3>
          <p>Lat: {{ clickedLat?.toFixed(5) }}, Lng: {{ clickedLng?.toFixed(5) }}</p>
          <ion-item>
            <ion-label position="stacked">Ville</ion-label>
            <ion-input v-model="city" placeholder="Ex: Talatamaty" readonly></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Type de problème</ion-label>
            <ion-select v-model="problemTypeId" interface="popover">
              <ion-select-option :value="1">nid de poule</ion-select-option>
              <ion-select-option :value="2">chaussée dégradée</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Statut</ion-label>
            <ion-select v-model="reportStatusId" interface="popover">
              <ion-select-option :value="1">en cours</ion-select-option>
              <ion-select-option :value="2">signalé</ion-select-option>
              <ion-select-option :value="5">terminé</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Utilisateur (user_id)</ion-label>
            <ion-input v-model="userId" placeholder="UID Firebase"></ion-input>
          </ion-item>
          <div class="actions">
            <ion-button color="medium" @click="closeModal">Annuler</ion-button>
            <ion-button color="primary" @click="submitReport">Enregistrer</ion-button>
          </div>
        </div>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonModal, IonButton, IonInput, IonSelect, IonSelectOption } from '@ionic/vue';
import { onMounted } from 'vue';
import { useReports } from '../composables/useReports';
import { useMap } from '../composables/useMap';
import { useReportForm } from '../composables/useReportForm';
import { formatMoney } from '../utils/formatters';

// Utilisation des composables
const { items, totalItems, totalBudget, avgProgress, totalTermines, loadReports } = useReports();
const { initializeMap, onMapClick } = useMap('map');
const { 
  showModal, 
  city, 
  problemTypeId, 
  reportStatusId, 
  userId, 
  clickedLat, 
  clickedLng, 
  openModal, 
  closeModal, 
  submitReport 
} = useReportForm();

onMounted(async () => {
  await loadReports();
  await initializeMap();
  onMapClick((lat, lng) => openModal(lat, lng));
});
</script>

<style scoped>
.map {
  height: 260px;
  margin: 12px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(0,0,0,0.08);
  z-index: 0;
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 12px;
}
.card {
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.icon {
  font-size: 22px;
  margin-bottom: 4px;
}
.label {
  color: #7f8c8d;
  font-size: 12px;
}
.value {
  font-size: 20px;
  font-weight: 700;
  color: #2c3e50;
}
.modal {
  padding: 20px;
}
.modal h3 {
  margin-top: 0;
}
.actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  justify-content: flex-end;
}
@media (max-width: 768px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
}
</style>
