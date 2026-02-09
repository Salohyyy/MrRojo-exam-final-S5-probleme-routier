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
        const photos: string[] = t.photos || [];

        if (Number.isFinite(lat) && Number.isFinite(lng) && this.map) {
          const icon = st.icon || '📍';

          // Photos HTML
          let photosHtml = '';
          if (photos.length > 0) {
            const thumbs = photos.slice(0, 4).map((src: string) => 
              `<img src="${src}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #ddd;cursor:pointer;" onclick="window.open(this.src)" />`
            ).join('');
            photosHtml = `
              <div style="margin-top:8px;">
                <div style="font-size:11px;color:#767676;margin-bottom:4px;">📷 ${photos.length} photo(s)</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">${thumbs}</div>
              </div>
            `;
          }

          L.circleMarker([lat, lng], {
            radius: 8,
            color: st.color,
            weight: 2,
            fillColor: st.fillColor,
            fillOpacity: 0.8
          })
            .addTo(this.map)
            .bindPopup(`
              <div style="min-width:200px;max-width:280px;">
                <div style="font-size: 24px; text-align: center; margin-bottom: 8px;">${icon}</div>
                <div style="font-weight: 600; color: #222222; margin-bottom: 4px;">${t.city || ''}</div>
                <div style="color: #767676; font-size: 13px; margin-bottom: 6px;">${t.company_name || ''}</div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom:4px;">
                  <span style="background: ${st.color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">${st.label}</span>
                  <span style="color: #00A699; font-weight: 600;">${p}%</span>
                </div>
                ${photosHtml}
              </div>
            `, { maxWidth: 300 });
        }
      });

      // Afficher les reports en attente (gris)
      const reportsSnap = await firestoreService.getReportsRaw();
      reportsSnap.forEach(d => {
        const data = d.data() as any;
        const key = String(data.postgres_report_id || d.id);
        const lat = Number(data.latitude);
        const lng = Number(data.longitude);
        const photos: string[] = data.photos || [];
        const typeKey = String(data.problem_type_id || '');
        const st = PROBLEM_STYLES[typeKey] || DEFAULT_STYLE;
        const icon = st.icon || '📍';

        if (!processed.has(key) && Number.isFinite(lat) && Number.isFinite(lng) && this.map) {
          // Photos HTML
          let photosHtml = '';
          if (photos.length > 0) {
            const thumbs = photos.slice(0, 4).map((src: string) => 
              `<img src="${src}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #ddd;cursor:pointer;" onclick="window.open(this.src)" />`
            ).join('');
            photosHtml = `
              <div style="margin-top:8px;">
                <div style="font-size:11px;color:#767676;margin-bottom:4px;">📷 ${photos.length} photo(s)</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">${thumbs}</div>
              </div>
            `;
          }

          L.circleMarker([lat, lng], {
            radius: 6,
            color: '#7f8c8d',
            weight: 2,
            fillColor: '#bdc3c7',
            fillOpacity: 0.9
          })
            .addTo(this.map)
            .bindPopup(`
              <div style="min-width:200px;max-width:280px;">
                <div style="font-size:20px;text-align:center;margin-bottom:4px;">${icon}</div>
                <div style="font-weight:600;color:#222;margin-bottom:2px;">${data.city || 'Ville inconnue'}</div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                  <span style="background:${st.color};color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">${st.label}</span>
                  <span style="color:#767676;font-size:12px;">en attente</span>
                </div>
                ${photosHtml}
              </div>
            `, { maxWidth: 300 });
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
