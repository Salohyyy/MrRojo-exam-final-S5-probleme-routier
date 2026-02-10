import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, Hammer, Wallet, Move, Info, Image, CheckCircle, Clock, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import useReportsTraite from '../../hooks/useReportsTraite';
import useFirebaseReportPhotos from '../../hooks/useReportPhotos';
import L from 'leaflet';

// Couleurs par source et statut
const MARKER_COLORS = {
  firebase_pending: '#e74c3c',
  local_new: '#f39c12',
  local_in_progress: '#3498db',
  local_completed: '#27ae60',
  local_rejected: '#95a5a6'
};

const getMarkerColor = (report) => {
  if (report.source === 'firebase') {
    return MARKER_COLORS.firebase_pending;
  }
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

const getMarkerIcon = (report) => {
  const color = getMarkerColor(report);
  const isFirebase = report.source === 'firebase';
  const isCompleted = report.status_name?.toLowerCase().includes('terminé') || report.progress >= 100;
  
  let innerIcon = '';
  if (isFirebase) {
    innerIcon = '!';
  } else if (isCompleted) {
    innerIcon = '✓';
  } else {
    innerIcon = '⚙';
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
  const { reports, loading, breakdown } = useReportsTraite();
  const defaultCenter = [-18.9056, 47.5256];
  
  const [selectedReportPhotos, setSelectedReportPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [hoveredFirebaseId, setHoveredFirebaseId] = useState(null);

  const { photos: hoveredPhotos, loading: photosLoading } = useFirebaseReportPhotos(hoveredFirebaseId);

  const openPhotoViewer = (photos) => {
    setSelectedReportPhotos(photos);
    setCurrentPhotoIndex(0);
    setShowPhotoViewer(true);
  };

  const closePhotoViewer = () => {
    setShowPhotoViewer(false);
    setSelectedReportPhotos([]);
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % selectedReportPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + selectedReportPhotos.length) % selectedReportPhotos.length);
  };

  const getFirebaseId = (report) => {
    return report.original_firebase_id || report.firebase_id || report.id?.toString();
  };

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

      {/* Barre de statut */}
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
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: MARKER_COLORS.firebase_pending, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 'bold' }}>!</div>
            <span>Signalé (non traité)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: MARKER_COLORS.local_new, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px' }}>⚙</div>
            <span>Nouveau (assigné)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: MARKER_COLORS.local_in_progress, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px' }}>⚙</div>
            <span>En cours de traitement</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: MARKER_COLORS.local_completed, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px' }}>✓</div>
            <span>Terminé</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: MARKER_COLORS.local_rejected, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px' }}>✕</div>
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
          const firebaseId = getFirebaseId(report);

          return (
            <Marker 
              key={report.id || firebaseId} 
              position={[lat, lng]}
              icon={getMarkerIcon(report)}
              eventHandlers={{
                popupopen: () => setHoveredFirebaseId(firebaseId),
                popupclose: () => setHoveredFirebaseId(null)
              }}
            >
              <Popup minWidth={300} maxWidth={400}>
                <div style={{ width: '100%', padding: '8px' }}>
                  {/* Badge Source/Statut */}
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: markerColor, padding: '8px 12px', borderRadius: '5px',
                    marginBottom: '12px', color: 'white', fontWeight: 'bold', fontSize: '12px'
                  }}>
                    {isFirebase ? (
                      <><AlertCircle size={14} /> SIGNALEMENT EN ATTENTE</>
                    ) : (
                      <>{report.progress >= 100 ? <CheckCircle size={14} /> : <Clock size={14} />} {report.status_name?.toUpperCase() || 'EN TRAITEMENT'}</>
                    )}
                  </div>

                  {/* Badge Type de Problème */}
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: '#f8f9fa', padding: '8px 12px', borderRadius: '5px',
                    marginBottom: '12px', color: '#e74c3c', fontWeight: 'bold'
                  }}>
                    <Info size={16} />
                    {report.problem_type_name?.toUpperCase() || "NON SPÉCIFIÉ"}
                  </div>

                  {/* Infos */}
                  <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={14} color="#7f8c8d" /> 
                      <span><strong>Quartier:</strong> {report.city}</span>
                    </div>
                    {!isFirebase && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Hammer size={14} color="#7f8c8d" /> 
                          <span><strong>Entreprise:</strong> {report.company_name || 'Non assigné'}</span>
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

                  {/* Section Photos */}
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Image size={16} color="#3498db" />
                        <strong>Photos du signalement</strong>
                      </div>
                      <span style={{ fontSize: '12px', color: '#7f8c8d' }}>
                        {hoveredFirebaseId === firebaseId && photosLoading ? 'Chargement...' : `${hoveredPhotos.length} photo(s)`}
                      </span>
                    </div>

                    {hoveredFirebaseId === firebaseId && hoveredPhotos.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginTop: '8px' }}>
                        {hoveredPhotos.slice(0, 6).map((photo, index) => (
                          <div 
                            key={photo.id || index}
                            style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer' }}
                            onClick={() => openPhotoViewer(hoveredPhotos)}
                            title="Cliquer pour voir en grand"
                          >
                            <img 
                              src={photo.full_base64 || photo.photo_base64}
                              alt={`Photo ${index + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg==';
                              }}
                            />
                            {index === 5 && hoveredPhotos.length > 6 && (
                              <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '12px', fontWeight: 'bold'
                              }}>
                                +{hoveredPhotos.length - 6}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {hoveredFirebaseId === firebaseId && hoveredPhotos.length === 0 && !photosLoading && (
                      <div style={{ padding: '10px', background: '#f8f9fa', borderRadius: '4px', textAlign: 'center', color: '#7f8c8d', fontSize: '12px' }}>
                        Aucune photo disponible
                      </div>
                    )}

                    {hoveredFirebaseId === firebaseId && photosLoading && (
                      <div style={{ padding: '10px', background: '#f8f9fa', borderRadius: '4px', textAlign: 'center', color: '#7f8c8d', fontSize: '12px' }}>
                        Chargement des photos...
                      </div>
                    )}
                  </div>

                  {/* Barre de progression (locaux seulement) */}
                  {!isFirebase && (
                    <div style={{ marginTop: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span>Avancement</span>
                        <strong>{report.progress || 0}%</strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#ecf0f1', borderRadius: '10px' }}>
                        <div style={{ 
                          width: `${report.progress || 0}%`, 
                          height: '100%', 
                          background: report.progress >= 100 ? '#27ae60' : report.progress >= 50 ? 'linear-gradient(90deg, #3498db, #2ecc71)' : '#f39c12', 
                          borderRadius: '10px', 
                          transition: 'width 1s ease-in-out'
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Message pour signalements Firebase */}
                  {isFirebase && (
                    <div style={{ marginTop: '15px', padding: '10px', background: '#fff3cd', borderRadius: '8px', fontSize: '12px', color: '#856404' }}>
                      ⏳ Ce signalement n'a pas encore été assigné à une entreprise de travaux.
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Modal visualisation photo plein écran */}
      {showPhotoViewer && selectedReportPhotos.length > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          {/* Bouton fermer */}
          <button
            onClick={closePhotoViewer}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'none', border: 'none', color: 'white',
              fontSize: '24px', cursor: 'pointer', zIndex: 10001
            }}
          >
            <X size={32} />
          </button>

          {/* Photo principale */}
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '80vh' }}>
            <img
              src={selectedReportPhotos[currentPhotoIndex]?.full_base64 || selectedReportPhotos[currentPhotoIndex]?.photo_base64}
              alt={`Photo ${currentPhotoIndex + 1}`}
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vbiBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==';
              }}
            />
          </div>

          {/* Navigation */}
          {selectedReportPhotos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                style={{
                  position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: 'white',
                  width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <ChevronLeft size={32} />
              </button>

              <button
                onClick={nextPhoto}
                style={{
                  position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: 'white',
                  width: '50px', height: '50px', borderRadius: '50%', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          {/* Miniatures */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', padding: '10px', overflowX: 'auto', maxWidth: '90vw' }}>
            {selectedReportPhotos.map((photo, index) => (
              <div
                key={photo.id || index}
                onClick={() => setCurrentPhotoIndex(index)}
                style={{
                  width: '60px', height: '60px', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer',
                  border: index === currentPhotoIndex ? '3px solid #3498db' : '1px solid #555',
                  opacity: index === currentPhotoIndex ? 1 : 0.6, transition: 'all 0.3s', flexShrink: 0
                }}
              >
                <img
                  src={photo.full_base64 || photo.photo_base64}
                  alt={`Thumbnail ${index + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=';
                  }}
                />
              </div>
            ))}
          </div>

          {/* Informations */}
          <div style={{ color: 'white', textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
            Photo {currentPhotoIndex + 1} sur {selectedReportPhotos.length}
          </div>
        </div>
      )}
    </div>
  );
}

export default MapReports;
