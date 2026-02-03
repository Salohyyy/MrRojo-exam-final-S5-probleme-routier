import { ref } from 'vue';
import { firestoreService } from '../services/firestore.service';
import { geocodingService } from '../services/geocoding.service';
import { ReportData } from '../types/report.types';

export function useReportForm() {
  const showModal = ref(false);
  const city = ref('');
  const problemTypeId = ref<number | null>(1);
  const reportStatusId = ref<number | null>(1);
  const userId = ref('');
  const clickedLat = ref<number | null>(null);
  const clickedLng = ref<number | null>(null);

  async function openModal(lat: number, lng: number) {
    clickedLat.value = lat;
    clickedLng.value = lng;
    await autoDetectCity(lat, lng);
    showModal.value = true;
  }

  function closeModal() {
    showModal.value = false;
    resetForm();
  }

  function resetForm() {
    city.value = '';
    userId.value = '';
    problemTypeId.value = 1;
    reportStatusId.value = 1;
    clickedLat.value = null;
    clickedLng.value = null;
  }

  async function autoDetectCity(lat: number, lng: number) {
    city.value = await geocodingService.reverseGeocode(lat, lng);
  }

  async function submitReport() {
    if (clickedLat.value === null || clickedLng.value === null) return;

    const reportData: ReportData = {
      city: city.value || '',
      is_synced: true,
      latitude: clickedLat.value,
      longitude: clickedLng.value,
      postgres_report_id: null,
      problem_type_id: Number(problemTypeId.value || 0),
      report_status_id: Number(reportStatusId.value || 0),
      reported_at: null, // sera remplacé par serverTimestamp dans le service
      user_id: userId.value || ''
    };

    await firestoreService.addReport(reportData);
    closeModal();
  }

  return {
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
  };
}
