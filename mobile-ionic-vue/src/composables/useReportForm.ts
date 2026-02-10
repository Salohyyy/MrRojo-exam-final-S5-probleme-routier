import { ref } from 'vue';
import { firestoreService } from '../services/firestore.service';
import { geocodingService } from '../services/geocoding.service';
import { authService } from '../services/auth.service';
import { photoService, PhotoData } from '../services/photo.service';
import { ReportData } from '../types/report.types';

export function useReportForm() {
  const showModal = ref(false);
  const city = ref('');
  const problemTypeId = ref<number | null>(1);
  const userId = ref('');
  const clickedLat = ref<number | null>(null);
  const clickedLng = ref<number | null>(null);
  const selectedPhotos = ref<PhotoData[]>([]);
  const uploadingPhotos = ref(false);

  async function openModal(lat: number, lng: number) {
    clickedLat.value = lat;
    clickedLng.value = lng;
    await autoDetectCity(lat, lng);
    
    // Remplir automatiquement l'userId avec l'utilisateur connecté
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      userId.value = currentUser.uid;
    }
    
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
    clickedLat.value = null;
    clickedLng.value = null;
    selectedPhotos.value = [];
    uploadingPhotos.value = false;
  }

  async function autoDetectCity(lat: number, lng: number) {
    city.value = await geocodingService.reverseGeocode(lat, lng);
  }

  async function takePhoto() {
    if (selectedPhotos.value.length >= 10) {
      alert('Vous pouvez ajouter maximum 10 photos');
      return;
    }
    const photo = await photoService.takePhoto();
    if (photo) {
      selectedPhotos.value.push(photo);
    }
  }

  async function pickPhoto() {
    if (selectedPhotos.value.length >= 10) {
      alert('Vous pouvez ajouter maximum 10 photos');
      return;
    }
    const photo = await photoService.pickPhoto();
    if (photo) {
      selectedPhotos.value.push(photo);
    }
  }

  function removePhoto(index: number) {
    selectedPhotos.value.splice(index, 1);
  }

  async function submitReport() {
    if (clickedLat.value === null || clickedLng.value === null) return;

    uploadingPhotos.value = true;

    try {
      // Récupérer les photos en base64 compressées
      const photosBase64 = selectedPhotos.value.length > 0
        ? photoService.getPhotoDataUrls(selectedPhotos.value)
        : undefined;

      const reportData: ReportData = {
        city: city.value || '',
        is_synced: true,
        latitude: clickedLat.value,
        longitude: clickedLng.value,
        postgres_report_id: null,
        problem_type_id: Number(problemTypeId.value || 0),
        report_status_id: 2, // Automatiquement "Signalé"
        reported_at: null,
        user_id: userId.value || '',
        photos: photosBase64
      };

      await firestoreService.addReport(reportData);
      closeModal();
    } catch (error) {
      console.error('Erreur lors de la soumission du rapport:', error);
      alert('Erreur lors de l\'envoi du rapport');
    } finally {
      uploadingPhotos.value = false;
    }
  }

  return {
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
  };
}
