<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
<ion-title>Suivi des Travaux</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
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
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel } from '@ionic/vue';
import { onMounted, ref, computed } from 'vue';
import { db } from '../main';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const items = ref<{ id: string; city: string; company_name: string; progress: number; report_status_id: string; budget: number }[]>([]);

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
</script>

<style scoped>
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
