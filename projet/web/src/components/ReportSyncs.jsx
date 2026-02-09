import React, { useState, useEffect } from 'react';
import { reportsAPI, utilsAPI } from '../services/api';

// Mapping statut -> progression automatique
const STATUS_PROGRESS_MAP = {
  1: 0,    // Nouveau = 0%
  2: 50,   // En cours = 50%
  3: 100,  // Terminé = 100%
  4: 0     // Rejeté = 0%
};

function ReportSyncs({ readOnly = false }) {
  const [reportSyncs, setReportSyncs] = useState([]);
  const [filteredReportSyncs, setFilteredReportSyncs] = useState([]);
  const [reportStatuses, setReportStatuses] = useState([]);
  const [allHistories, setAllHistories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Modal de changement de statut
  const [statusModal, setStatusModal] = useState(null);
  const [modalStatusId, setModalStatusId] = useState('');
  const [modalDate, setModalDate] = useState('');

  // Filtres
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchCity, setSearchCity] = useState('');

  // Onglet actif
  const [activeTab, setActiveTab] = useState('chantiers');

  useEffect(() => {
    fetchReportSyncs();
    fetchReportStatuses();
    fetchAllHistories();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reportSyncs, selectedStatus, searchCity]);

  const fetchReportSyncs = async () => {
    try {
      const response = await (readOnly ? reportsAPI.getPublicReportSyncs() : reportsAPI.getReportSyncs());
      setReportSyncs(response.data);
      setFilteredReportSyncs(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchReportStatuses = async () => {
    try {
      const response = await utilsAPI.getReportStatuses();
      setReportStatuses(response.data);
    } catch (err) {
      console.error('Erreur statuts:', err);
    }
  };

  const fetchAllHistories = async () => {
    try {
      const response = await reportsAPI.getAllReportSyncHistories();
      setAllHistories(response.data);
    } catch (err) {
      console.error('Erreur historiques:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...reportSyncs];
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(sync => sync.report_status_id === parseInt(selectedStatus));
    }
    if (searchCity.trim() !== '') {
      filtered = filtered.filter(sync =>
        sync.city.toLowerCase().includes(searchCity.toLowerCase())
      );
    }
    setFilteredReportSyncs(filtered);
  };

  const resetFilters = () => {
    setSelectedStatus('all');
    setSearchCity('');
  };

  const openStatusModal = (sync) => {
    setStatusModal({ syncId: sync.id, currentStatusId: sync.report_status_id });
    setModalStatusId(sync.report_status_id.toString());
    setModalDate(new Date().toISOString().slice(0, 16));
  };

  const closeStatusModal = () => {
    setStatusModal(null);
    setModalStatusId('');
    setModalDate('');
  };

  const confirmStatusUpdate = async () => {
    if (!statusModal || !modalStatusId || !modalDate) return;

    setUpdatingId(statusModal.syncId);
    try {
      await reportsAPI.updateReportSyncStatus(statusModal.syncId, parseInt(modalStatusId), modalDate);

      const newProgress = STATUS_PROGRESS_MAP[parseInt(modalStatusId)] ?? 0;
      const newStatus = reportStatuses.find(s => s.id === parseInt(modalStatusId));

      setReportSyncs(prev =>
        prev.map(sync => {
          if (sync.id === statusModal.syncId) {
            return {
              ...sync,
              report_status_id: parseInt(modalStatusId),
              progress: newProgress,
              status_name: newStatus?.name || sync.status_name
            };
          }
          return sync;
        })
      );

      await fetchAllHistories();
      showNotification('Mise à jour réussie', 'success');
      closeStatusModal();
    } catch (err) {
      console.error('Erreur:', err);
      showNotification('Erreur: ' + err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; padding: 16px 24px;
      background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
      color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000; font-weight: bold; animation: slideIn 0.3s ease;
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
      'Nouveau': '#95a5a6',
      'En attente': '#95a5a6',
      'Signalé': '#3498db',
      'En cours': '#f39c12',
      'En réparation': '#e67e22',
      'Terminé': '#27ae60',
      'Rejeté': '#e74c3c'
    };
    return colors[statusName] || '#7f8c8d';
  };

  // ========== HELPERS STATISTIQUES ==========

  const computeDelayStats = () => {
    const grouped = {};
    allHistories.forEach(h => {
      if (!grouped[h.report_sync_id]) grouped[h.report_sync_id] = [];
      grouped[h.report_sync_id].push(h);
    });

    const stats = [];
    reportSyncs.forEach(sync => {
      const histories = grouped[sync.id] || [];
      if (histories.length === 0) return;

      const sorted = [...histories].sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));

      const dateNouveau = sorted.find(h => h.status_name === 'Nouveau');
      const dateEnCours = sorted.find(h => h.status_name === 'En cours');
      const dateTermine = sorted.find(h => h.status_name === 'Terminé');

      const delayNouveauToEnCours = dateNouveau && dateEnCours
        ? Math.round((new Date(dateEnCours.changed_at) - new Date(dateNouveau.changed_at)) / (1000 * 60 * 60 * 24))
        : null;

      const delayEnCoursToTermine = dateEnCours && dateTermine
        ? Math.round((new Date(dateTermine.changed_at) - new Date(dateEnCours.changed_at)) / (1000 * 60 * 60 * 24))
        : null;

      const delayTotal = dateNouveau && dateTermine
        ? Math.round((new Date(dateTermine.changed_at) - new Date(dateNouveau.changed_at)) / (1000 * 60 * 60 * 24))
        : null;

      stats.push({
        id: sync.id,
        city: sync.city,
        problem_name: sync.problem_name,
        company_name: sync.company_name,
        status_name: sync.status_name,
        dateNouveau: dateNouveau ? new Date(dateNouveau.changed_at).toLocaleDateString('fr-FR') : '-',
        dateEnCours: dateEnCours ? new Date(dateEnCours.changed_at).toLocaleDateString('fr-FR') : '-',
        dateTermine: dateTermine ? new Date(dateTermine.changed_at).toLocaleDateString('fr-FR') : '-',
        delayNouveauToEnCours,
        delayEnCoursToTermine,
        delayTotal,
        histories: sorted
      });
    });

    return stats;
  };

  const computeAverages = (stats) => {
    const withDelay1 = stats.filter(s => s.delayNouveauToEnCours !== null);
    const withDelay2 = stats.filter(s => s.delayEnCoursToTermine !== null);
    const withTotal = stats.filter(s => s.delayTotal !== null);

    return {
      avgNouveauToEnCours: withDelay1.length > 0
        ? (withDelay1.reduce((sum, s) => sum + s.delayNouveauToEnCours, 0) / withDelay1.length).toFixed(1)
        : '-',
      avgEnCoursToTermine: withDelay2.length > 0
        ? (withDelay2.reduce((sum, s) => sum + s.delayEnCoursToTermine, 0) / withDelay2.length).toFixed(1)
        : '-',
      avgTotal: withTotal.length > 0
        ? (withTotal.reduce((sum, s) => sum + s.delayTotal, 0) / withTotal.length).toFixed(1)
        : '-',
      countTotal: withTotal.length,
      countEnCours: withDelay1.length
    };
  };

  // ========== RENDU ==========

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}>⏳</div>
        <p>Chargement des chantiers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <h2>Erreur de chargement</h2>
        <p>{error}</p>
        <button onClick={fetchReportSyncs} style={styles.retryButton}>Réessayer</button>
      </div>
    );
  }

  const delayStats = computeDelayStats();
  const averages = computeAverages(delayStats);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🚧 Suivi des Chantiers</h1>
          <p style={styles.subtitle}>📊 Gestion de l'avancement des travaux</p>
        </div>
        <button onClick={() => { fetchReportSyncs(); fetchAllHistories(); }} style={styles.refreshButton}>
          🔄 Actualiser
        </button>
      </div>

      {/* Onglets */}
      <div style={styles.tabContainer}>
        <button
          onClick={() => setActiveTab('chantiers')}
          style={{ ...styles.tabButton, ...(activeTab === 'chantiers' ? styles.tabActive : {}) }}
        >
          🚧 Chantiers
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          style={{ ...styles.tabButton, ...(activeTab === 'stats' ? styles.tabActive : {}) }}
        >
          📊 Statistiques des délais
        </button>
      </div>

      {activeTab === 'chantiers' && (
        <>
          {/* Filtres */}
          <div style={styles.filterContainer}>
            <h3 style={styles.filterTitle}>🔍 Filtres</h3>
            <div style={styles.filterGrid}>
              <div style={styles.filterItem}>
                <label style={styles.filterLabel}>Statut :</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">Tous les statuts</option>
                  {reportStatuses.map(status => (
                    <option key={status.id} value={status.id}>{status.name}</option>
                  ))}
                </select>
              </div>
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
              <div style={styles.filterItem}>
                <button onClick={resetFilters} style={styles.resetButton}>🔄 Réinitialiser</button>
              </div>
            </div>
            <div style={styles.filterResults}>
              📊 <strong>{filteredReportSyncs.length}</strong> résultat(s) sur {reportSyncs.length} au total
            </div>
          </div>

          {/* Stats résumé */}
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

          {/* Tableau des chantiers */}
          {filteredReportSyncs.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>📭 Aucun résultat ne correspond à vos filtres</p>
              <button onClick={resetFilters} style={styles.resetButton}>Réinitialiser les filtres</button>
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
                    <th style={styles.th}>Statut</th>
                    <th style={styles.th}>Historique des étapes</th>
                    {!readOnly && <th style={styles.th}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredReportSyncs.map((sync) => {
                    const syncHistories = (allHistories || [])
                      .filter(h => h.report_sync_id === sync.id)
                      .sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));
                    const progress = STATUS_PROGRESS_MAP[sync.report_status_id] ?? sync.progress;

                    return (
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
                                width: `${progress}%`,
                                backgroundColor: getProgressColor(progress)
                              }}
                            >
                              {progress}%
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
                          {syncHistories.length > 0 ? (
                            <div style={styles.timeline}>
                              {syncHistories.map((h) => (
                                <div key={h.id} style={styles.timelineItem}>
                                  <div style={{
                                    ...styles.timelineDot,
                                    backgroundColor: getStatusColor(h.status_name)
                                  }} />
                                  <div style={styles.timelineContent}>
                                    <span style={styles.timelineStatus}>{h.status_name}</span>
                                    <span style={styles.timelineDate}>
                                      {new Date(h.changed_at).toLocaleDateString('fr-FR')}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={styles.smallText}>Aucun historique</span>
                          )}
                        </td>
                        {!readOnly && (
                          <td style={styles.td}>
                            <button
                              onClick={() => openStatusModal(sync)}
                              disabled={updatingId === sync.id}
                              style={styles.changeStatusBtn}
                            >
                              {updatingId === sync.id ? '⏳' : '✏️ Modifier'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'stats' && (
        <div>
          {/* Résumé des moyennes */}
          <div style={styles.statsOverview}>
            <h2 style={styles.statsTitle}>⏱️ Délai de traitement moyen des travaux</h2>
            <div style={styles.stats}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>⏱️</div>
                <h3>Nouveau → En cours</h3>
                <p style={styles.statNumber}>{averages.avgNouveauToEnCours} jours</p>
                <p style={styles.smallText}>{averages.countEnCours} chantier(s)</p>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>🔧</div>
                <h3>En cours → Terminé</h3>
                <p style={styles.statNumber}>{averages.avgEnCoursToTermine} jours</p>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>📅</div>
                <h3>Délai total moyen</h3>
                <p style={styles.statNumber}>{averages.avgTotal} jours</p>
                <p style={styles.smallText}>{averages.countTotal} chantier(s) terminé(s)</p>
              </div>
            </div>
          </div>

          {/* Tableau détaillé */}
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Ville</th>
                  <th style={styles.th}>Problème</th>
                  <th style={styles.th}>Entreprise</th>
                  <th style={styles.th}>Statut actuel</th>
                  <th style={styles.th}>Date Nouveau</th>
                  <th style={styles.th}>Date En cours</th>
                  <th style={styles.th}>Date Terminé</th>
                  <th style={styles.th}>Nouveau → En cours</th>
                  <th style={styles.th}>En cours → Terminé</th>
                  <th style={styles.th}>Délai total</th>
                </tr>
              </thead>
              <tbody>
                {delayStats.map((stat) => (
                  <tr key={stat.id} style={styles.tr}>
                    <td style={styles.td}><strong>#{stat.id}</strong></td>
                    <td style={styles.td}><span style={styles.cityBadge}>📍 {stat.city}</span></td>
                    <td style={styles.td}>{stat.problem_name}</td>
                    <td style={styles.td}>{stat.company_name}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(stat.status_name)
                      }}>
                        {stat.status_name}
                      </span>
                    </td>
                    <td style={styles.td}>{stat.dateNouveau}</td>
                    <td style={styles.td}>{stat.dateEnCours}</td>
                    <td style={styles.td}>{stat.dateTermine}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.delayBadge,
                        backgroundColor: stat.delayNouveauToEnCours !== null
                          ? (stat.delayNouveauToEnCours > 7 ? '#e74c3c' : stat.delayNouveauToEnCours > 3 ? '#f39c12' : '#27ae60')
                          : '#bdc3c7'
                      }}>
                        {stat.delayNouveauToEnCours !== null ? `${stat.delayNouveauToEnCours} j` : '-'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.delayBadge,
                        backgroundColor: stat.delayEnCoursToTermine !== null
                          ? (stat.delayEnCoursToTermine > 14 ? '#e74c3c' : stat.delayEnCoursToTermine > 7 ? '#f39c12' : '#27ae60')
                          : '#bdc3c7'
                      }}>
                        {stat.delayEnCoursToTermine !== null ? `${stat.delayEnCoursToTermine} j` : '-'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.delayBadge,
                        backgroundColor: stat.delayTotal !== null
                          ? (stat.delayTotal > 21 ? '#e74c3c' : stat.delayTotal > 10 ? '#f39c12' : '#27ae60')
                          : '#bdc3c7'
                      }}>
                        {stat.delayTotal !== null ? `${stat.delayTotal} j` : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
                {delayStats.length === 0 && (
                  <tr>
                    <td colSpan="11" style={{ ...styles.td, textAlign: 'center', color: '#95a5a6' }}>
                      Aucun historique disponible pour calculer les délais
                    </td>
                  </tr>
                )}
              </tbody>
              {delayStats.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: '#2c3e50' }}>
                    <td colSpan="8" style={{ ...styles.td, color: 'white', fontWeight: 'bold', textAlign: 'right' }}>
                      MOYENNE
                    </td>
                    <td style={{ ...styles.td, color: 'white', fontWeight: 'bold' }}>
                      {averages.avgNouveauToEnCours} j
                    </td>
                    <td style={{ ...styles.td, color: 'white', fontWeight: 'bold' }}>
                      {averages.avgEnCoursToTermine} j
                    </td>
                    <td style={{ ...styles.td, color: 'white', fontWeight: 'bold' }}>
                      {averages.avgTotal} j
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Modal changement de statut */}
      {statusModal && (
        <div style={styles.modalOverlay} onClick={closeStatusModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>✏️ Modifier le statut - Chantier #{statusModal.syncId}</h2>

            <div style={styles.modalField}>
              <label style={styles.modalLabel}>Nouveau statut :</label>
              <select
                value={modalStatusId}
                onChange={(e) => setModalStatusId(e.target.value)}
                style={styles.filterSelect}
              >
                {reportStatuses.map(status => (
                  <option key={status.id} value={status.id}>{status.name}</option>
                ))}
              </select>
              {modalStatusId && (
                <p style={styles.modalHint}>
                  Progression automatique : <strong>{STATUS_PROGRESS_MAP[parseInt(modalStatusId)] ?? 0}%</strong>
                </p>
              )}
            </div>

            <div style={styles.modalField}>
              <label style={styles.modalLabel}>Date du changement :</label>
              <input
                type="datetime-local"
                value={modalDate}
                onChange={(e) => setModalDate(e.target.value)}
                style={styles.filterInput}
              />
            </div>

            <div style={styles.modalActions}>
              <button onClick={closeStatusModal} style={styles.resetButton}>Annuler</button>
              <button
                onClick={confirmStatusUpdate}
                disabled={!modalStatusId || !modalDate}
                style={{
                  ...styles.refreshButton,
                  opacity: (!modalStatusId || !modalDate) ? 0.5 : 1
                }}
              >
                ✅ Confirmer
              </button>
            </div>
          </div>
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
    marginBottom: '20px',
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  title: { color: '#2c3e50', margin: 0, fontSize: '28px' },
  subtitle: { color: '#7f8c8d', fontSize: '14px', margin: '8px 0 0 0' },
  refreshButton: {
    padding: '12px 24px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold'
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
  tabContainer: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    backgroundColor: 'white',
    padding: '6px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  tabButton: {
    flex: 1,
    padding: '14px 24px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#7f8c8d',
    backgroundColor: 'transparent',
    transition: 'all 0.2s'
  },
  tabActive: {
    backgroundColor: '#3498db',
    color: 'white'
  },
  filterContainer: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  filterTitle: { margin: '0 0 16px 0', color: '#2c3e50', fontSize: '18px' },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '16px'
  },
  filterItem: { display: 'flex', flexDirection: 'column', gap: '8px' },
  filterLabel: { fontSize: '14px', fontWeight: 'bold', color: '#34495e' },
  filterSelect: {
    padding: '10px',
    border: '2px solid #bdc3c7',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  filterInput: {
    padding: '10px',
    border: '2px solid #bdc3c7',
    borderRadius: '6px',
    fontSize: '14px'
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
    marginTop: 'auto'
  },
  filterResults: {
    padding: '10px',
    backgroundColor: '#ecf0f1',
    borderRadius: '6px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#2c3e50'
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  statCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    textAlign: 'center'
  },
  statIcon: { fontSize: '32px', marginBottom: '8px' },
  statNumber: { fontSize: '28px', fontWeight: 'bold', color: '#3498db', margin: '8px 0 0 0' },
  statsOverview: { marginBottom: '20px' },
  statsTitle: { color: '#2c3e50', fontSize: '22px', marginBottom: '16px' },
  loading: { textAlign: 'center', padding: '60px', fontSize: '20px', color: '#7f8c8d' },
  spinner: { fontSize: '48px', marginBottom: '20px' },
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
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    backgroundColor: '#34495e',
    color: 'white',
    padding: '14px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '13px',
    textTransform: 'uppercase',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  tr: { borderBottom: '1px solid #ecf0f1', transition: 'background-color 0.2s' },
  td: { padding: '14px', fontSize: '14px', color: '#2c3e50' },
  cityBadge: {
    backgroundColor: '#3498db',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: 'bold',
    display: 'inline-block'
  },
  smallText: { fontSize: '12px', color: '#7f8c8d', marginTop: '4px' },
  progressContainer: {
    width: '100%',
    backgroundColor: '#ecf0f1',
    borderRadius: '12px',
    overflow: 'hidden',
    height: '28px'
  },
  progressBar: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '13px',
    transition: 'width 0.5s ease'
  },
  statusBadge: {
    padding: '6px 14px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '13px',
    fontWeight: 'bold',
    display: 'inline-block'
  },
  delayBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '13px',
    fontWeight: 'bold',
    display: 'inline-block'
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  timelineItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  timelineDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0
  },
  timelineContent: {
    display: 'flex',
    flexDirection: 'column'
  },
  timelineStatus: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  timelineDate: {
    fontSize: '11px',
    color: '#7f8c8d'
  },
  changeStatusBtn: {
    padding: '8px 16px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  modal: {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '16px',
    width: '440px',
    maxWidth: '90vw',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
  },
  modalTitle: {
    margin: '0 0 24px 0',
    fontSize: '20px',
    color: '#2c3e50'
  },
  modalField: {
    marginBottom: '20px'
  },
  modalLabel: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#34495e'
  },
  modalHint: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#7f8c8d'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    backgroundColor: '#fff',
    borderRadius: '12px'
  },
  emptyText: {
    fontSize: '18px',
    color: '#95a5a6',
    marginBottom: '16px'
  }
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  table tbody tr:hover {
    background-color: #f8f9fa;
  }
`;
document.head.appendChild(styleSheet);

export default ReportSyncs;