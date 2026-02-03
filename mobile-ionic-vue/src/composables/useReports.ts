import { ref, computed } from 'vue';
import { firestoreService } from '../services/firestore.service';
import { Report } from '../types/report.types';

export function useReports() {
  const items = ref<Report[]>([]);
  const isLoading = ref(false);

  const totalItems = computed(() => items.value.length);
  
  const totalBudget = computed(() => 
    items.value.reduce((sum, item) => sum + (Number(item.budget) || 0), 0)
  );
  
  const avgProgress = computed(() => {
    if (items.value.length === 0) return 0;
    const sum = items.value.reduce((acc, item) => acc + (Number(item.progress) || 0), 0);
    return sum / items.value.length;
  });
  
  const totalTermines = computed(() => 
    items.value.filter(item => Number(item.progress) >= 100).length
  );

  async function loadReports() {
    isLoading.value = true;
    try {
      items.value = await firestoreService.getReportTraites();
    } catch (error) {
      console.error('Erreur lors du chargement des reports:', error);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    items,
    isLoading,
    totalItems,
    totalBudget,
    avgProgress,
    totalTermines,
    loadReports
  };
}
