import { ref, computed } from 'vue';
import { firestoreService } from '../services/firestore.service';
import { Report } from '../types/report.types';

export function useReports() {
  const items = ref<Report[]>([]);
  const myItems = ref<Report[]>([]);
  const isLoading = ref(false);
  const filterMode = ref<'all' | 'mine'>('all');

  const displayedItems = computed(() => 
    filterMode.value === 'mine' ? myItems.value : items.value
  );

  const totalItems = computed(() => displayedItems.value.length);
  
  const totalBudget = computed(() => 
    displayedItems.value.reduce((sum, item) => sum + (Number(item.budget) || 0), 0)
  );
  
  const avgProgress = computed(() => {
    if (displayedItems.value.length === 0) return 0;
    const sum = displayedItems.value.reduce((acc, item) => acc + (Number(item.progress) || 0), 0);
    return sum / displayedItems.value.length;
  });
  
  const totalTermines = computed(() => 
    displayedItems.value.filter(item => Number(item.progress) >= 100).length
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

  async function loadMyReports(userId: string) {
    isLoading.value = true;
    try {
      myItems.value = await firestoreService.getMyReports(userId);
    } catch (error) {
      console.error('Erreur lors du chargement de mes signalements:', error);
    } finally {
      isLoading.value = false;
    }
  }

  function setFilter(mode: 'all' | 'mine') {
    filterMode.value = mode;
  }

  return {
    items,
    myItems,
    displayedItems,
    isLoading,
    totalItems,
    totalBudget,
    avgProgress,
    totalTermines,
    filterMode,
    loadReports,
    loadMyReports,
    setFilter
  };
}
