import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../utils/leaflet-icons';
import { PROBLEM_STYLES, DEFAULT_STYLE, MAP_CONFIG } from '../constants/map.constants';
import { firestoreService } from './firestore.service';

export class MapService {
  private map: L.Map | null = null;

  initMap(containerId: string): L.Map {
    this.map = L.map(containerId, { zoomControl: true }).setView(
      [MAP_CONFIG.center.lat, MAP_CONFIG.center.lng],
      MAP_CONFIG.zoom
    );

    L.tileLayer(MAP_CONFIG.tileLayerUrl, {
      maxZoom: MAP_CONFIG.maxZoom,
      attribution: MAP_CONFIG.attribution
    }).addTo(this.map);

    return this.map;
  }

  async loadMarkers() {
    if (!this.map) return;

    try {
      const traiteSnap = await firestoreService.getReportTraitesRaw();
      const processed = new Set<string>(
        traiteSnap.map(d => {
          const dt = d.data() as any;
          return String(dt.postgres_report_id || '');
        })
      );

      // Afficher les reports traités
      traiteSnap.forEach(d => {
        const t = d.data() as any;
        const lat = Number(t.latitude);
        const lng = Number(t.longitude);
        const p = Number(t.progress);
        const typeKey = String(t.problem_type_id || '');
        const st = PROBLEM_STYLES[typeKey] || DEFAULT_STYLE;

        if (Number.isFinite(lat) && Number.isFinite(lng) && this.map) {
          L.circleMarker([lat, lng], {
            radius: 7,
            color: st.color,
            weight: 2,
            fillColor: st.fillColor,
            fillOpacity: 0.9
          })
            .addTo(this.map)
            .bindPopup(`${t.city || ''} • ${t.company_name || ''} • ${st.label} • ${p}%`);
        }
      });

      // Afficher les reports en attente (gris)
      const reportsSnap = await firestoreService.getReportsRaw();
      reportsSnap.forEach(d => {
        const data = d.data() as any;
        const key = String(data.postgres_report_id || d.id);
        const lat = Number(data.latitude);
        const lng = Number(data.longitude);

        if (!processed.has(key) && Number.isFinite(lat) && Number.isFinite(lng) && this.map) {
          L.circleMarker([lat, lng], {
            radius: 6,
            color: '#7f8c8d',
            weight: 2,
            fillColor: '#bdc3c7',
            fillOpacity: 0.9
          })
            .addTo(this.map)
            .bindPopup(`${data.city || 'Ville inconnue'} • en attente de traitement`);
        }
      });
    } catch (err) {
      console.warn('Erreur lors du chargement des marqueurs:', err);
    }
  }

  onMapClick(callback: (lat: number, lng: number) => void) {
    if (!this.map) return;
    this.map.on('click', (e: any) => {
      callback(e.latlng.lat, e.latlng.lng);
    });
  }

  getMap(): L.Map | null {
    return this.map;
  }
}

export const mapService = new MapService();
