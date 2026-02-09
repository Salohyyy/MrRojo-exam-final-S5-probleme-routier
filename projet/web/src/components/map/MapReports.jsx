import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, Hammer, Wallet, Move, Info } from 'lucide-react'; // Icônes
import 'leaflet/dist/leaflet.css';
import useReportsTraite from '../../hooks/useReportsTraite';
import L from 'leaflet';

// Fonction pour changer la couleur de l'icône selon le problème
const getMarkerIcon = (type) => {
  let color = '#3498db'; // Bleu par défaut
  if (type?.toLowerCase().includes('lavaka')) color = '#e74c3c'; // Rouge pour nid de poule
  if (type?.toLowerCase().includes('goudron')) color = '#2c3e50'; // Noir pour bitume
  
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
    iconSize: [15, 15],
    iconAnchor: [7, 7]
  });
};

function MapReports({ showAdminButton, onAdminButtonClick }) {
  const { reports, loading, error } = useReportsTraite();
  const defaultCenter = [-18.9056, 47.5256];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
      
      {showAdminButton && (
        <button 
            onClick={onAdminButtonClick}
            style={{
                position: 'absolute',
                top: 80,
                right: 20,
                zIndex: 1000,
                padding: '12px 24px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
        >
            🛠️ Gérer les Chantiers
        </button>
      )}

      {/* Barre de statut élégante */}
      <div style={{ 
        position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, background: 'rgba(255,255,255,0.9)', padding: '10px 20px',
        borderRadius: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
        display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold'
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27ae60' }}></div>
        {loading ? "Synchronisation..." : `${reports.length} Anomalies détectées à Tana`}
      </div>

      <MapContainer center={defaultCenter} zoom={13} style={{ width: '100%', height: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {reports.map((report) => {
          const lat = parseFloat(report.latitude);
          const lng = parseFloat(report.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker 
              key={report.id} 
              position={[lat, lng]}
              icon={getMarkerIcon(report.problem_type_name)}
              eventHandlers={{
                mouseover: (e) => e.target.openPopup(),
              }}
            >
              <Popup className="custom-popup">
                <div style={{ width: '250px', padding: '5px' }}>
                  {/* Badge Type de Problème */}
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: '#f8f9fa', padding: '5px 10px', borderRadius: '5px',
                    marginBottom: '10px', color: '#e74c3c', fontWeight: 'bold'
                  }}>
                    <Info size={16} />
                    {report.problem_type_name?.toUpperCase() || "NON SPÉCIFIÉ"}
                  </div>

                  {/* Infos avec icônes */}
                  <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={14} color="#7f8c8d" /> 
                      <span><strong>Quartier:</strong> {report.city}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Hammer size={14} color="#7f8c8d" /> 
                      <span><strong>Entrep:</strong> {report.company_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Wallet size={14} color="#7f8c8d" /> 
                      <span><strong>Budget:</strong> {report.budget ? report.budget.toLocaleString() : 'N/A'} Ar</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Move size={14} color="#7f8c8d" /> 
                      <span><strong>Surface:</strong> {report.surface || 'N/A'} m²</span>
                    </div>
                  </div>

                  {/* Barre de progression stylisée */}
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>Avancement</span>
                      <strong>{report.progress || 0}%</strong>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#ecf0f1', borderRadius: '10px' }}>
                      <div style={{ 
                        width: `${report.progress || 0}%`, height: '100%', 
                        background: 'linear-gradient(90deg, #3498db, #2ecc71)', 
                        borderRadius: '10px', transition: 'width 1s ease-in-out'
                      }} />
                    </div>
                  </div>
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
