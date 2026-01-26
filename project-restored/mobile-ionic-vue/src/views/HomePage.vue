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
  <ion-modal :is-open="showModal" @didDismiss="showModal=false">
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
            <ion-button color="medium" @click="showModal=false">Annuler</ion-button>
            <ion-button color="primary" @click="submitReport">Enregistrer</ion-button>
          </div>
        </div>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonModal, IonButton, IonInput, IonSelect, IonSelectOption } from '@ionic/vue';
import { onMounted, ref, computed } from 'vue';
import { db } from '../main';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const items = ref<{ id: string; city: string; company_name: string; progress: number; report_status_id: string; budget: number }[]>([]);
const PROBLEM_STYLES: Record<string, { color: string; fillColor: string; label: string }> = {
  '1': { color: '#e74c3c', fillColor: '#e74c3c', label: 'nid de poule' },
  '2': { color: '#e67e22', fillColor: '#e67e22', label: 'chaussée dégradée' },
  '3': { color: '#f1c40f', fillColor: '#f1c40f', label: 'lampadaires' },
  '4': { color: '#9b59b6', fillColor: '#9b59b6', label: 'fissure' },
  '5': { color: '#3498db', fillColor: '#3498db', label: 'glissement' }
};
const DEFAULT_STYLE = { color: '#2c3e50', fillColor: '#2c3e50', label: 'problème' };

onMounted(async () => {
  const q = query(collection(db, 'report_traites'), orderBy('progress', 'desc'));
  const snap = await getDocs(q);
  items.value = snap.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      city: data.city || '',
      company_name: data.company_name || '',
      progress: Number(data.progress) || 0,
      report_status_id: String(data.report_status_id || ''),
      budget: Number(data.budget) || 0
    };
  });
  const map = L.map('map', { zoomControl: true }).setView([-18.8792, 47.5079], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);
  // Marquer en gris les reports qui ne sont pas encore dans report_traites
  try {
    const traiteSnap = await getDocs(collection(db, 'report_traites'));
    const processed = new Set<string>(
      traiteSnap.docs.map(d => {
        const dt = d.data() as any;
        return String(dt.postgres_report_id || '');
      })
    );
    traiteSnap.docs.forEach(d => {
      const t = d.data() as any;
      const lat = Number(t.latitude);
      const lng = Number(t.longitude);
      const p = Number(t.progress);
      const typeKey = String(t.problem_type_id || '');
      const st = PROBLEM_STYLES[typeKey] || DEFAULT_STYLE;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        L.circleMarker([lat, lng], {
          radius: 7,
          color: st.color,
          weight: 2,
          fillColor: st.fillColor,
          fillOpacity: 0.9
        }).addTo(map).bindPopup(`${t.city || ''} • ${t.company_name || ''} • ${st.label} • ${p}%`);
      }
    });
    const reportsSnap = await getDocs(collection(db, 'reports'));
    reportsSnap.docs.forEach(d => {
      const data = d.data() as any;
      const key = String(data.postgres_report_id || d.id);
      const lat = Number(data.latitude);
      const lng = Number(data.longitude);
      if (!processed.has(key) && Number.isFinite(lat) && Number.isFinite(lng)) {
        L.circleMarker([lat, lng], {
          radius: 6,
          color: '#7f8c8d',
          weight: 2,
          fillColor: '#bdc3c7',
          fillOpacity: 0.9
        }).addTo(map).bindPopup(`${data.city || 'Ville inconnue'} • en attente de traitement`);
      }
    });
  } catch (err) {
    console.warn('Erreur lors du chargement des marqueurs reports:', err);
  }
  map.on('click', async (e: any) => {
    clickedLat.value = e.latlng.lat;
    clickedLng.value = e.latlng.lng;
    await autoDetectCity(clickedLat.value, clickedLng.value);
    showModal.value = true;
  });
});

const totalItems = computed(() => items.value.length);
const totalBudget = computed(() => items.value.reduce((s, i) => s + (Number(i.budget) || 0), 0));
const avgProgress = computed(() => {
  if (items.value.length === 0) return 0;
  const s = items.value.reduce((sum, i) => sum + (Number(i.progress) || 0), 0);
  return s / items.value.length;
});
const totalTermines = computed(() => items.value.filter(i => Number(i.progress) >= 100).length);

function formatMoney(v: number) {
  return `${Math.round(v).toLocaleString('fr-FR')} Ar`;
}

const showModal = ref(false);
const city = ref('');
const problemTypeId = ref<number | null>(1);
const reportStatusId = ref<number | null>(1);
const userId = ref('');
const clickedLat = ref<number | null>(null);
const clickedLng = ref<number | null>(null);

async function submitReport() {
  if (clickedLat.value === null || clickedLng.value === null) return;
  await addDoc(collection(db, 'reports'), {
    city: city.value || '',
    is_synced: true,
    latitude: clickedLat.value,
    longitude: clickedLng.value,
    postgres_report_id: null,
    problem_type_id: Number(problemTypeId.value || 0),
    report_status_id: Number(reportStatusId.value || 0),
    reported_at: serverTimestamp(),
    user_id: userId.value || ''
  });
  showModal.value = false;
  city.value = '';
  userId.value = '';
}

async function autoDetectCity(lat: number, lng: number) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`;
    const res = await fetch(url, { headers: { 'User-Agent': 'MrRojo-Mobile/1.0' } });
    const json = await res.json();
    const addr = json.address || {};
    city.value =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.suburb ||
      (json.display_name ? String(json.display_name).split(',')[0] : '');
  } catch (e) {
    console.warn('Reverse geocoding failed', e);
  }
}
</script>

<style scoped>
.map {
  height: 260px;
  margin: 12px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(0,0,0,0.08);
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
@media (max-width: 768px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
}
</style>
