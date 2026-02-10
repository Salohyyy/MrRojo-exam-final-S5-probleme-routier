import { nextTick } from 'vue';
import { mapService } from '../services/map.service';

export function useMap(containerId: string) {
  async function initializeMap() {
    // Attendre que le DOM soit prêt
    await nextTick();
    mapService.initMap(containerId);
    await mapService.loadMarkers();
  }

  async function reloadMarkers() {
    await mapService.loadMarkers();
  }

  function onMapClick(callback: (lat: number, lng: number) => void) {
    mapService.onMapClick(callback);
  }

  return {
    initializeMap,
    reloadMarkers,
    onMapClick
  };
}
