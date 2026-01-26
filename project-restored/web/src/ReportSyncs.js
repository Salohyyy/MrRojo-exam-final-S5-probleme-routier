import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:4000';

function ReportSyncs() {
  const [reportSyncs, setReportSyncs] = useState([]);
  const [filteredReportSyncs, setFilteredReportSyncs] = useState([]);
  const [reportStatuses, setReportStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  
  // États pour les filtres
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchCity, setSearchCity] = useState('');
  const [minProgress, setMinProgress] = useState(0);
  const [maxProgress, setMaxProgress] = useState(100);

  useEffect(() => {
    fetchReportSyncs();
    fetchReportStatuses();
  }, []);

  // Appliquer les filtres quand les données ou les filtres changent
  useEffect(() => {
    applyFilters();
  }, [reportSyncs, selectedStatus, searchCity, minProgress, maxProgress]);

  const fetchReportSyncs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/report-syncs`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setReportSyncs(data);
      setFilteredReportSyncs(data);
      setLoading(false);
    } catch (err) {
      console.error('❌ Erreur:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchReportStatuses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/report-statuses`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setReportStatuses(data);
    } catch (err) {
      console.error('❌ Erreur statuts:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...reportSyncs];

    // Filtre par statut
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(sync => sync.report_status_id === parseInt(selectedStatus));
    }

    // Filtre par ville
    if (searchCity.trim() !== '') {
      filtered = filtered.filter(sync => 
        sync.city.toLowerCase().includes(searchCity.toLowerCase())
      );
    }

    // Filtre par progression
    filtered = filtered.filter(sync => 
      sync.progress >= minProgress && sync.progress <= maxProgress
    );

    setFilteredReportSyncs(filtered);
  };

  const resetFilters = () => {
    setSelectedStatus('all');
    setSearchCity('');
    setMinProgress(0);
    setMaxProgress(100);
  };

  const updateStatus = async (id, newStatusId) => {
    setUpdatingId(id);
    
    try {
      const response = await fetch(`${API_URL}/api/report-syncs/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_status_id: parseInt(newStatusId)
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Mettre à jour localement
      setReportSyncs(prev => 
        prev.map(sync => {
          if (sync.id === id) {
            const newStatus = reportStatuses.find(s => s.id === parseInt(newStatusId));
            return {
              ...sync,
              report_status_id: parseInt(newStatusId),
              status_name: newStatus?.name || sync.status_name
            };
          }
          return sync;
        })
      );
      
      showNotification('✅ ' + result.message, 'success');
    } catch (err) {
      console.error('❌ Erreur:', err);
      showNotification('❌ Erreur: ' + err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-weight: bold;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  const getProgressColor = (progress) => {
    if (progress >= 75) return '#27ae60';
    if (progress >= 50) return '#f39c12';
    if (progress >= 25) return '#e67e22';
    return '#e74c3c';
  };

  const getStatusColor = (statusName) => {
    const colors = {
      'En attente': '#95a5a6',
      'Signalé': '#3498db',
      'En cours': '#f39c12',
      'En réparation': '#e67e22',
      'Terminé': '#27ae60',
      'Rejeté': '#e74c3c'
    };
    return colors[statusName] || '#7f8c8d';
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}>⏳</div>
        <p>Chargement depuis PostgreSQL...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={styles.error}>
        <h2>❌ Erreur de chargement</h2>
        <p>{error}</p>
        <button onClick={fetchReportSyncs} style={styles.retryButton}>
          🔄 Réessayer
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🚧 Suivi des Travaux Routiers</h1>
          <p style={styles.subtitle}>
            📊 PostgreSQL → 🔥 Firebase (Sync auto)
          </p>
        </div>
        <button onClick={fetchReportSyncs} style={styles.refreshButton}>
          🔄 Actualiser
        </button>
      </div>

      {/* FILTRES */}
      <div style={styles.filterContainer}>
        <h3 style={styles.filterTitle}>🔍 Filtres</h3>
        
        <div style={styles.filterGrid}>
          {/* Filtre par statut */}
          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>Statut :</label>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">Tous les statuts</option>
              {reportStatuses.map(status => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par ville */}
          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>Ville :</label>
            <input
              type="text"
              placeholder="Rechercher une ville..."
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              style={styles.filterInput}
            />
          </div>

          {/* Filtre par progression min */}
          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>Progression min : {minProgress}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={minProgress}
              onChange={(e) => setMinProgress(parseInt(e.target.value))}
              style={styles.filterRange}
            />
          </div>

          {/* Filtre par progression max */}
          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>Progression max : {maxProgress}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={maxProgress}
              onChange={(e) => setMaxProgress(parseInt(e.target.value))}
              style={styles.filterRange}
            />
          </div>

          {/* Bouton reset */}
          <div style={styles.filterItem}>
            <button onClick={resetFilters} style={styles.resetButton}>
              🔄 Réinitialiser les filtres
            </button>
          </div>
        </div>

        {/* Compteur de résultats */}
        <div style={styles.filterResults}>
          📊 <strong>{filteredReportSyncs.length}</strong> résultat(s) sur {reportSyncs.length} au total
        </div>
      </div>

      {/* STATISTIQUES */}
      <div style={styles.stats}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📊</div>
          <h3>Affichés</h3>
          <p style={styles.statNumber}>{filteredReportSyncs.length}</p>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💰</div>
          <h3>Budget Total</h3>
          <p style={styles.statNumber}>
            {filteredReportSyncs.reduce((sum, rs) => sum + parseFloat(rs.budget || 0), 0).toLocaleString()} Ar
          </p>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📈</div>
          <h3>Progression Moyenne</h3>
          <p style={styles.statNumber}>
            {filteredReportSyncs.length > 0 
              ? (filteredReportSyncs.reduce((sum, rs) => sum + parseFloat(rs.progress || 0), 0) / filteredReportSyncs.length).toFixed(1)
              : 0}%
          </p>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>✅</div>
          <h3>Terminés</h3>
          <p style={styles.statNumber}>
            {filteredReportSyncs.filter(rs => rs.status_name === 'Terminé').length}
          </p>
        </div>
      </div>

      {/* TABLEAU */}
      {filteredReportSyncs.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>📭 Aucun résultat ne correspond à vos filtres</p>
          <button onClick={resetFilters} style={styles.resetButton}>
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Ville</th>
                <th style={styles.th}>Problème</th>
                <th style={styles.th}>Entreprise</th>
                <th style={styles.th}>Surface</th>
                <th style={styles.th}>Budget</th>
                <th style={styles.th}>Progression</th>
                <th style={styles.th}>Statut Actuel</th>
                <th style={styles.th}>Changer Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredReportSyncs.map((sync) => (
                <tr key={sync.id} style={styles.tr}>
                  <td style={styles.td}><strong>#{sync.id}</strong></td>
                  <td style={styles.td}>
                    <span style={styles.cityBadge}>📍 {sync.city}</span>
                  </td>
                  <td style={styles.td}>
                    <div>
                      <strong>{sync.problem_name}</strong>
                      <div style={styles.smallText}>
                        {new Date(sync.reported_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div>
                      <strong>{sync.company_name}</strong>
                      <div style={styles.smallText}>{sync.company_address}</div>
                    </div>
                  </td>
                  <td style={styles.td}>{sync.surface}</td>
                  <td style={styles.td}>
                    <strong>{parseFloat(sync.budget).toLocaleString()} Ar</strong>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.progressContainer}>
                      <div 
                        style={{
                          ...styles.progressBar,
                          width: `${sync.progress}%`,
                          backgroundColor: getProgressColor(sync.progress)
                        }}
                      >
                        {sync.progress}%
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(sync.status_name)
                    }}>
                      {sync.status_name}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <select 
                      value={sync.report_status_id}
                      onChange={(e) => updateStatus(sync.id, e.target.value)}
                      disabled={updatingId === sync.id}
                      style={styles.select}
                    >
                      {reportStatuses.map(status => (
                        <option key={status.id} value={status.id}>
                          {status.name}
                        </option>
                      ))}
                    </select>
                    {updatingId === sync.id && <span style={{marginLeft: '10px'}}>⏳</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { 
    padding: '20px', 
    maxWidth: '1800px', 
    margin: '0 auto', 
    fontFamily: 'Arial, sans-serif', 
    backgroundColor: '#f5f7fa', 
    minHeight: '100vh' 
  },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '30px', 
    backgroundColor: 'white', 
    padding: '24px', 
    borderRadius: '12px', 
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)' 
  },
  title: { 
    color: '#2c3e50', 
    margin: 0, 
    fontSize: '32px' 
  },
  subtitle: { 
    color: '#7f8c8d', 
    fontSize: '14px', 
    margin: '8px 0 0 0' 
  },
  refreshButton: { 
    padding: '12px 24px', 
    backgroundColor: '#3498db', 
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontSize: '16px', 
    fontWeight: 'bold',
    transition: 'background-color 0.2s'
  },
  retryButton: { 
    marginTop: '20px', 
    padding: '12px 24px', 
    backgroundColor: '#3498db', 
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontSize: '16px', 
    fontWeight: 'bold' 
  },
  filterContainer: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  filterTitle: {
    margin: '0 0 20px 0',
    color: '#2c3e50',
    fontSize: '20px'
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  },
  filterItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#34495e'
  },
  filterSelect: {
    padding: '10px',
    border: '2px solid #bdc3c7',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'border-color 0.2s'
  },
  filterInput: {
    padding: '10px',
    border: '2px solid #bdc3c7',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'border-color 0.2s'
  },
  filterRange: {
    width: '100%',
    cursor: 'pointer'
  },
  resetButton: {
    padding: '10px 20px',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
    marginTop: 'auto'
  },
  filterResults: {
    padding: '12px',
    backgroundColor: '#ecf0f1',
    borderRadius: '6px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#2c3e50'
  },
  stats: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
    gap: '20px', 
    marginBottom: '30px' 
  },
  statCard: { 
    backgroundColor: '#fff', 
    padding: '25px', 
    borderRadius: '12px', 
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', 
    textAlign: 'center' 
  },
  statIcon: { 
    fontSize: '36px', 
    marginBottom: '12px' 
  },
  statNumber: { 
    fontSize: '32px', 
    fontWeight: 'bold', 
    color: '#3498db', 
    margin: '10px 0 0 0' 
  },
  loading: { 
    textAlign: 'center', 
    padding: '60px', 
    fontSize: '20px', 
    color: '#7f8c8d' 
  },
  spinner: { 
    fontSize: '48px', 
    marginBottom: '20px' 
  },
  error: { 
    textAlign: 'center', 
    padding: '60px', 
    color: '#e74c3c', 
    fontSize: '18px', 
    backgroundColor: '#fadbd8', 
    borderRadius: '12px', 
    margin: '20px' 
  },
  tableContainer: { 
    backgroundColor: '#fff', 
    borderRadius: '12px', 
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', 
    overflow: 'auto' 
  },
  table: { 
    width: '100%', 
    borderCollapse: 'collapse' 
  },
  th: { 
    backgroundColor: '#34495e', 
    color: 'white', 
    padding: '18px', 
    textAlign: 'left', 
    fontWeight: '600', 
    fontSize: '14px', 
    textTransform: 'uppercase',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  tr: { 
    borderBottom: '1px solid #ecf0f1',
    transition: 'background-color 0.2s'
  },
  td: { 
    padding: '18px', 
    fontSize: '14px', 
    color: '#2c3e50' 
  },
  cityBadge: { 
    backgroundColor: '#3498db', 
    color: 'white', 
    padding: '6px 14px', 
    borderRadius: '16px', 
    fontSize: '13px', 
    fontWeight: 'bold', 
    display: 'inline-block' 
  },
  smallText: { 
    fontSize: '12px', 
    color: '#7f8c8d', 
    marginTop: '6px' 
  },
  progressContainer: { 
    width: '100%', 
    backgroundColor: '#ecf0f1', 
    borderRadius: '12px', 
    overflow: 'hidden', 
    height: '32px' 
  },
  progressBar: { 
    height: '100%', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    color: 'white', 
    fontWeight: 'bold', 
    transition: 'width 0.5s ease' 
  },
  statusBadge: { 
    padding: '8px 18px', 
    borderRadius: '20px', 
    color: 'white', 
    fontSize: '13px', 
    fontWeight: 'bold', 
    display: 'inline-block' 
  },
  select: { 
    padding: '10px 14px', 
    border: '2px solid #3498db', 
    borderRadius: '8px', 
    fontSize: '14px', 
    backgroundColor: 'white', 
    cursor: 'pointer', 
    fontWeight: '500', 
    minWidth: '150px' 
  },
  emptyState: { 
    textAlign: 'center', 
    padding: '80px', 
    backgroundColor: '#fff', 
    borderRadius: '12px' 
  },
  emptyText: { 
    fontSize: '20px', 
    color: '#95a5a6',
    marginBottom: '20px'
  }
};

// Animation CSS
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  table tbody tr:hover {
    background-color: #f8f9fa;
  }
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    height: 8px;
    background: #ddd;
    border-radius: 5px;
    outline: none;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    background: #3498db;
    cursor: pointer;
    border-radius: 50%;
  }
  input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: #3498db;
    cursor: pointer;
    border-radius: 50%;
    border: none;
  }
  select:hover, input:hover {
    border-color: #3498db !important;
  }
  button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;
document.head.appendChild(styleSheet);

export default ReportSyncs;