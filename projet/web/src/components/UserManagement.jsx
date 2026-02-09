import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';

function UserManagement() {
  const [unsyncedUsers, setUnsyncedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState(null);

  // Formulaire d'insertion
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    birth_date: ''
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchUnsyncedUsers();
  }, []);

  const fetchUnsyncedUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getUnsyncedUsers();
      setUnsyncedUsers(response.data);
      setSelectedIds([]);
      setError(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ========== FORMULAIRE ==========

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      showNotification('Email et mot de passe sont requis', 'error');
      return;
    }
    setFormLoading(true);
    try {
      await usersAPI.createLocalUser(formData);
      showNotification('Utilisateur créé avec succès', 'success');
      setFormData({ username: '', email: '', password: '', birth_date: '' });
      setShowForm(false);
      await fetchUnsyncedUsers();
    } catch (err) {
      console.error('Erreur création:', err);
      showNotification(err.response?.data?.error || 'Erreur lors de la création', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // ========== SÉLECTION ==========

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === unsyncedUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(unsyncedUsers.map(u => u.id));
    }
  };

  // ========== SYNCHRONISATION ==========

  const syncSingleUser = async (userId) => {
    setSyncingId(userId);
    try {
      const response = await usersAPI.syncUserToFirebase(userId);
      showNotification(`Synchronisé : ${response.data.firebase_uid}`, 'success');
      await fetchUnsyncedUsers();
    } catch (err) {
      console.error('Erreur sync:', err);
      showNotification(err.response?.data?.error || 'Erreur de synchronisation', 'error');
    } finally {
      setSyncingId(null);
    }
  };

  const syncSelectedUsers = async () => {
    if (selectedIds.length === 0) {
      showNotification('Aucun utilisateur sélectionné', 'error');
      return;
    }
    setSyncing(true);
    try {
      const response = await usersAPI.syncMultipleUsers(selectedIds);
      const { success, errors } = response.data;
      let msg = `${success.length} synchronisé(s)`;
      if (errors.length > 0) {
        msg += `, ${errors.length} erreur(s)`;
      }
      showNotification(msg, errors.length > 0 ? 'warning' : 'success');
      await fetchUnsyncedUsers();
    } catch (err) {
      console.error('Erreur sync multiple:', err);
      showNotification(err.response?.data?.error || 'Erreur de synchronisation', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // ========== NOTIFICATION ==========

  const showNotification = (message, type) => {
    const colors = { success: '#27ae60', error: '#e74c3c', warning: '#f39c12' };
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; padding: 16px 24px;
      background: ${colors[type] || colors.success};
      color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000; font-weight: bold; animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  // ========== RENDU ==========

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <p>Chargement des utilisateurs...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>👥 Gestion des Utilisateurs</h1>
          <p style={styles.subtitle}>Insertion locale et synchronisation vers Firebase</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => setShowForm(!showForm)} style={styles.addButton}>
            {showForm ? '✕ Fermer' : '➕ Nouvel utilisateur'}
          </button>
          <button onClick={fetchUnsyncedUsers} style={styles.refreshButton}>
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* Formulaire d'insertion */}
      {showForm && (
        <div style={styles.formContainer}>
          <h3 style={styles.formTitle}>Créer un utilisateur (base locale)</h3>
          <form onSubmit={handleCreateUser} style={styles.form}>
            <div style={styles.formGrid}>
              <div style={styles.formField}>
                <label style={styles.formLabel}>Nom d'utilisateur</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleFormChange}
                  placeholder="ex: jean.dupont"
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="ex: jean@example.com"
                  required
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>Mot de passe *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  placeholder="Min. 6 caractères"
                  required
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>Date de naissance</label>
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleFormChange}
                  style={styles.formInput}
                />
              </div>
            </div>
            <div style={styles.formActions}>
              <button type="button" onClick={() => setShowForm(false)} style={styles.cancelButton}>
                Annuler
              </button>
              <button type="submit" disabled={formLoading} style={{
                ...styles.submitButton,
                opacity: formLoading ? 0.6 : 1
              }}>
                {formLoading ? '⏳ Création...' : '✅ Créer l\'utilisateur'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Barre d'actions synchronisation */}
      {unsyncedUsers.length > 0 && (
        <div style={styles.syncBar}>
          <div style={styles.syncBarLeft}>
            <input
              type="checkbox"
              checked={selectedIds.length === unsyncedUsers.length && unsyncedUsers.length > 0}
              onChange={toggleSelectAll}
              style={styles.checkbox}
            />
            <span style={styles.syncBarText}>
              {selectedIds.length > 0
                ? `${selectedIds.length} sélectionné(s)`
                : 'Tout sélectionner'}
            </span>
          </div>
          <div style={styles.syncBarRight}>
            <span style={styles.syncBarInfo}>
              🔴 {unsyncedUsers.length} utilisateur(s) non synchronisé(s)
            </span>
            <button
              onClick={syncSelectedUsers}
              disabled={selectedIds.length === 0 || syncing}
              style={{
                ...styles.syncAllButton,
                opacity: (selectedIds.length === 0 || syncing) ? 0.5 : 1
              }}
            >
              {syncing ? '⏳ Synchronisation...' : `🔄 Synchroniser (${selectedIds.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div style={styles.errorBox}>
          <strong>Erreur :</strong> {error}
          <button onClick={fetchUnsyncedUsers} style={{ marginLeft: '12px', cursor: 'pointer', border: 'none', background: 'none', color: '#e74c3c', fontWeight: 'bold' }}>
            Réessayer
          </button>
        </div>
      )}

      {/* Liste des utilisateurs non synchronisés */}
      {unsyncedUsers.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <p style={styles.emptyText}>Tous les utilisateurs sont synchronisés avec Firebase</p>
          <button onClick={() => setShowForm(true)} style={styles.addButton}>
            ➕ Créer un nouvel utilisateur
          </button>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === unsyncedUsers.length}
                    onChange={toggleSelectAll}
                    style={styles.checkbox}
                  />
                </th>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Nom</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Statut</th>
                <th style={styles.th}>Date de naissance</th>
                <th style={styles.th}>Créé le</th>
                <th style={styles.th}>Firebase</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {unsyncedUsers.map((user) => (
                <tr key={user.id} style={{
                  ...styles.tr,
                  backgroundColor: selectedIds.includes(user.id) ? '#eaf2fd' : 'transparent'
                }}>
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(user.id)}
                      onChange={() => toggleSelect(user.id)}
                      style={styles.checkbox}
                    />
                  </td>
                  <td style={styles.td}><strong>#{user.id}</strong></td>
                  <td style={styles.td}>{user.username || <span style={{ color: '#bdc3c7', fontStyle: 'italic' }}>non défini</span>}</td>
                  <td style={styles.td}>
                    <span style={styles.emailBadge}>📧 {user.email}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: user.status_name === 'active' ? '#27ae60'
                        : user.status_name === 'blocked' ? '#e74c3c' : '#95a5a6'
                    }}>
                      {user.status_name}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {user.birth_date
                      ? new Date(user.birth_date).toLocaleDateString('fr-FR')
                      : '-'}
                  </td>
                  <td style={styles.td}>
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.unsyncBadge}>🔴 Non synchronisé</span>
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => syncSingleUser(user.id)}
                      disabled={syncingId === user.id}
                      style={{
                        ...styles.syncButton,
                        opacity: syncingId === user.id ? 0.6 : 1
                      }}
                    >
                      {syncingId === user.id ? '⏳' : '🔄 Sync Firebase'}
                    </button>
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
    maxWidth: '1400px',
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
  headerActions: { display: 'flex', gap: '10px' },
  addButton: {
    padding: '12px 24px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  refreshButton: {
    padding: '12px 24px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  // Formulaire
  formContainer: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '2px solid #27ae60'
  },
  formTitle: { margin: '0 0 20px 0', color: '#2c3e50', fontSize: '18px' },
  form: {},
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  formField: { display: 'flex', flexDirection: 'column', gap: '6px' },
  formLabel: { fontSize: '13px', fontWeight: 'bold', color: '#34495e' },
  formInput: {
    padding: '10px',
    border: '2px solid #bdc3c7',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'border-color 0.2s'
  },
  formActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  submitButton: {
    padding: '10px 24px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  // Sync bar
  syncBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '16px 24px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  syncBarLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  syncBarRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  syncBarText: { fontSize: '14px', color: '#2c3e50', fontWeight: '500' },
  syncBarInfo: { fontSize: '14px', color: '#e74c3c', fontWeight: '600' },
  syncAllButton: {
    padding: '10px 24px',
    backgroundColor: '#e67e22',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer' },
  // Erreur
  errorBox: {
    backgroundColor: '#fadbd8',
    color: '#e74c3c',
    padding: '14px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  // Table
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
  emailBadge: {
    backgroundColor: '#3498db',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: 'bold',
    display: 'inline-block'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-block'
  },
  unsyncBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    backgroundColor: '#fadbd8',
    color: '#e74c3c',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-block'
  },
  syncButton: {
    padding: '8px 16px',
    backgroundColor: '#e67e22',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold'
  },
  // Empty / Loading
  loading: { textAlign: 'center', padding: '60px', fontSize: '20px', color: '#7f8c8d' },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  emptyText: { fontSize: '18px', color: '#95a5a6', marginBottom: '20px' }
};

// CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  table tbody tr:hover {
    background-color: #f8f9fa !important;
  }
`;
document.head.appendChild(styleSheet);

export default UserManagement;
