import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';

// Centre d'Antananarivo
const position = [-18.8792, 47.5079];

// Fix pour les icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function App() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [mapInfo, setMapInfo] = useState(null);

  // URLs configurées via variables d'environnement
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const TILES_URL = import.meta.env.VITE_TILES_URL || 'http://localhost:8080';

  useEffect(() => {
    // Tester la connexion à l'API
    axios.get(`${API_URL}/api/test`)
      .then(response => setMapInfo(response.data))
      .catch(error => console.error('Erreur API:', error));

    // Charger les items
    fetchItems();
  }, []);

  const fetchItems = () => {
    axios.get(`${API_URL}/api/items`)
      .then(response => setItems(response.data))
      .catch(error => console.error('Erreur:', error));
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    
    axios.post(`${API_URL}/api/items`, { description: newItem })
      .then(() => {
        setNewItem('');
        fetchItems();
      })
      .catch(error => console.error('Erreur:', error));
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '300px', 
        padding: '20px', 
        background: '#f5f5f5',
        overflowY: 'auto'
      }}>
        <h1>Carte Offline Antananarivo</h1>
        
        <div style={{ marginBottom: '20px', padding: '10px', background: 'white', borderRadius: '5px' }}>
          <h3>Statut de connexion:</h3>
          {mapInfo ? (
            <p style={{ color: 'green' }}>
              ✓ Connecté à PostgreSQL<br />
              Heure serveur: {new Date(mapInfo.time).toLocaleTimeString()}
            </p>
          ) : (
            <p style={{ color: 'orange' }}>Chargement...</p>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Ajouter un élément de test</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Description"
              style={{ flex: 1, padding: '8px' }}
            />
            <button onClick={addItem} style={{ padding: '8px 16px' }}>
              Ajouter
            </button>
          </div>
        </div>

        <div>
          <h3>Éléments en base de données:</h3>
          <ul>
            {items.map(item => (
              <li key={item.id} style={{ padding: '5px 0' }}>
                {item.description}
                <br />
                <small style={{ color: '#666' }}>
                  ID: {item.id} • Créé le: {new Date(item.created_at).toLocaleDateString()}
                </small>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Carte */}
      <div style={{ flex: 1 }}>
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url={`${TILES_URL}/data/antananarivo/{z}/{x}/{y}.pbf`}
            attribution="© OpenStreetMap contributors"
          />
          <Marker position={position}>
            <Popup>
              <b>Antananarivo</b><br />
              Centre de la carte
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}

export default App;
