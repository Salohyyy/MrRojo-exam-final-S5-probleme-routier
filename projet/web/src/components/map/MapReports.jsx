import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, Hammer, Wallet, Move, Info, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import useReportsTraite from '../../hooks/useReportsTraite';
import L from 'leaflet';

// Couleurs par source et statut
const MARKER_COLORS = {
  firebase_pending: '#e74c3c',  // Rouge - Signalé Firebase, non traité
  local_new: '#f39c12',         // Orange - Local nouveau (en attente)
  local_in_progress: '#3498db', // Bleu - Local en cours
  local_completed: '#27ae60',   // Vert - Local terminé
  local_rejected: '#95a5a6'     // Gris - Local rejeté
};

// Fonction pour obtenir la couleur du marqueur selon source et statut
const getMarkerColor = (report) => {
  if (report.source === 'firebase') {
    return MARKER_COLORS.firebase_pending;
  }
  
  // Source locale - couleur selon le statut
  const statusName = report.status_name?.toLowerCase() || '';
  if (statusName.includes('terminé') || report.progress >= 100) {
    return MARKER_COLORS.local_completed;
  }
  if (statusName.includes('cours') || (report.progress > 0 && report.progress < 100)) {
    return MARKER_COLORS.local_in_progress;
  }
  if (statusName.includes('rejeté')) {
    return MARKER_COLORS.local_rejected;
  }
  return MARKER_COLORS.local_new;
};

// Fonction pour créer l'icône du marqueur
const getMarkerIcon = (report) => {
  const color = getMarkerColor(report);
  const isFirebase = report.source === 'firebase';
  const isCompleted = report.status_name?.toLowerCase().includes('terminé') || report.progress >= 100;
  
  // Icône différente selon la source
  let innerIcon = '';
  if (isFirebase) {
    innerIcon = '!'; // Point d'exclamation pour les non traités
  } else if (isCompleted) {
    innerIcon = '✓'; // Check pour terminés
  } else {
    innerIcon = '⚙'; // Engrenage pour en cours
  }
  
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background-color: ${color}; 
        width: ${isFirebase ? '16px' : '20px'}; 
        height: ${isFirebase ? '16px' : '20px'}; 
        border-radius: ${isFirebase ? '50%' : '4px'}; 
        border: 2px solid white; 
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: bold;
      ">${innerIcon}</div>
    `,
    iconSize: [isFirebase ? 20 : 24, isFirebase ? 20 : 24],
    iconAnchor: [isFirebase ? 10 : 12, isFirebase ? 10 : 12]
  });
};

function MapReports({ showAdminButton, onAdminButtonClick }) {
  const { reports, loading, error, breakdown } = useReportsTraite();
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
        zIndex: 1000, background: 'rgba(255,255,255,0.95)', padding: '10px 20px',
        borderRadius: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
        display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold'
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27ae60' }}></div>
        {loading ? "Synchronisation..." : `${reports.length} Signalements (${breakdown.local} traités, ${breakdown.firebase_pending} en attente)`}
      </div>

      {/* Légende */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        zIndex: 1000,
        background: 'rgba(255,255,255,0.95)',
        padding: '15px',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
        fontSize: '13px',
        minWidth: '200px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
          📍 Légende
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '16px', height: '16px', borderRadius: '50%', 
              backgroundColor: MARKER_COLORS.firebase_pending,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '10px', fontWeight: 'bold'
            }}>!</div>
            <span>Signalé (non traité)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '18px', height: '18px', borderRadius: '4px', 
              backgroundColor: MARKER_COLORS.local_new,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '10px'
            }}>⚙</div>
            <span>Nouveau (assigné)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '18px', height: '18px', borderRadius: '4px', 
              backgroundColor: MARKER_COLORS.local_in_progress,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '10px'
            }}>⚙</div>
            <span>En cours de traitement</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '18px', height: '18px', borderRadius: '4px', 
              backgroundColor: MARKER_COLORS.local_completed,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '10px'
            }}>✓</div>
            <span>Terminé</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '18px', height: '18px', borderRadius: '4px', 
              backgroundColor: MARKER_COLORS.local_rejected,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '10px'
            }}>✕</div>
            <span>Rejeté</span>
          </div>
        </div>
      </div>

      <MapContainer center={defaultCenter} zoom={13} style={{ width: '100%', height: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="http://localhost:8080/styles/basic-preview/{z}/{x}/{y}.png"
          errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        />

        {reports.map((report) => {
          const lat = parseFloat(report.latitude);
          const lng = parseFloat(report.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          const isFirebase = report.source === 'firebase';
          const markerColor = getMarkerColor(report);

          return (
            <Marker 
              key={report.id} 
              position={[lat, lng]}
              icon={getMarkerIcon(report)}
              eventHandlers={{
                mouseover: (e) => e.target.openPopup(),
              }}
            >
              <Popup className="custom-popup">
                <div style={{ width: '280px', padding: '5px' }}>
                  {/* Badge Source */}
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: markerColor, padding: '5px 10px', borderRadius: '5px',
                    marginBottom: '10px', color: 'white', fontWeight: 'bold', fontSize: '12px'
                  }}>
                    {isFirebase ? (
                      <>
                        <AlertCircle size={14} />
                        SIGNALEMENT EN ATTENTE
                      </>
                    ) : (
                      <>
                        {report.progress >= 100 ? <CheckCircle size={14} /> : <Clock size={14} />}
                        {report.status_name?.toUpperCase() || 'EN TRAITEMENT'}
                      </>
                    )}
                  </div>

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
                    {!isFirebase && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Hammer size={14} color="#7f8c8d" /> 
                          <span><strong>Entrep:</strong> {report.company_name || 'Non assigné'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Wallet size={14} color="#7f8c8d" /> 
                          <span><strong>Budget:</strong> {report.budget ? parseFloat(report.budget).toLocaleString() : 'N/A'} Ar</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Move size={14} color="#7f8c8d" /> 
                          <span><strong>Surface:</strong> {report.surface || 'N/A'} m²</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Barre de progression (seulement pour les locaux) */}
                  {!isFirebase && (
                    <div style={{ marginTop: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span>Avancement</span>
                        <strong>{report.progress || 0}%</strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#ecf0f1', borderRadius: '10px' }}>
                        <div style={{ 
                          width: `${report.progress || 0}%`, height: '100%', 
                          background: report.progress >= 100 
                            ? '#27ae60' 
                            : report.progress >= 50 
                              ? 'linear-gradient(90deg, #3498db, #2ecc71)' 
                              : '#f39c12', 
                          borderRadius: '10px', transition: 'width 1s ease-in-out'
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Message pour signalements Firebase */}
                  {isFirebase && (
                    <div style={{ 
                      marginTop: '15px', 
                      padding: '10px', 
                      background: '#fff3cd', 
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#856404'
                    }}>
                      ⏳ Ce signalement n'a pas encore été assigné à une entreprise de travaux.
                    </div>
                  )}
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
