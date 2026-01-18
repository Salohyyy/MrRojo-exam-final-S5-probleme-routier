import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import useReportsTraite from '../../hooks/useReportsTraite';

function MapReports() {
  const { reports, loading, error } = useReportsTraite();

  const defaultCenter = [-18.9, 47.5];

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      {loading && <p>Chargement des signalements...</p>}
      {!loading && !error && (
        <p style={{ position: 'absolute', zIndex: 1000, margin: 8 }}>
          {reports.length} signalement(s) chargés
        </p>
      )}
      {error && <p>Erreur lors du chargement des signalements.</p>}
      <MapContainer
        center={defaultCenter}
        zoom={12}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {reports.map(report => {
          const lat = Number(report.latitude);
          const lng = Number(report.longitude);
          if (Number.isNaN(lat) || Number.isNaN(lng)) {
            return null;
          }
          return (
            <Marker key={report.id} position={[lat, lng]}>
              <Popup>
                <div>
                  <div>Ville : {report.city}</div>
                  <div>Société : {report.company_name}</div>
                  <div>Budget : {report.budget}</div>
                  <div>Avancement : {report.progress}</div>
                  <div>Surface : {report.surface}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default MapReports;
