import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

function AllUsers() {
  const [users, setUsers] = useState([]);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [customAttempts, setCustomAttempts] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersResponse, settingsResponse] = await Promise.all([
        adminAPI.getAllUsers(),
        adminAPI.getSettings()
      ]);
      setUsers(usersResponse.data);
      setGlobalSettings(settingsResponse.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      showMessage('error', 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleUnblock = async (uid, email) => {
    if (!confirm(`Débloquer l'utilisateur ${email} ?`)) {
      return;
    }

    try {
      await adminAPI.unblockUser(uid);
      showMessage('success', `Utilisateur ${email} débloqué avec succès`);
      loadData();
    } catch (error) {
      console.error('Erreur déblocage:', error);
      showMessage('error', 'Erreur lors du déblocage');
    }
  };

  const handleEditMaxAttempts = (user) => {
    setEditingUser(user.uid);
    setCustomAttempts(user.custom_max_attempts || '');
  };

  const handleSaveMaxAttempts = async (uid) => {
    try {
      const attempts = customAttempts === '' ? null : parseInt(customAttempts);
      await adminAPI.updateUserMaxAttempts(uid, attempts);
      showMessage('success', 'Nombre de tentatives mis à jour');
      setEditingUser(null);
      loadData();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      showMessage('error', error.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setCustomAttempts('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const getMaxAttemptsDisplay = (user) => {
    if (user.custom_max_attempts !== null) {
      return `${user.custom_max_attempts} (personnalisé)`;
    }
    return `${globalSettings?.max_login_attempts || '-'} (global)`;
  };

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Gestion des utilisateurs</h2>

      {message.text && (
        <div style={{
          ...styles.message,
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
        }}>
          {message.text}
        </div>
      )}

      <div style={styles.info}>
        <p>
          <strong>Paramètre global :</strong> {globalSettings?.max_login_attempts} tentatives maximum
        </p>
        <p style={styles.infoText}>
          Vous pouvez définir un nombre de tentatives personnalisé pour chaque utilisateur.
          Laissez vide pour utiliser le paramètre global.
        </p>
      </div>

      {users.length === 0 ? (
        <div style={styles.empty}>
          <p>Aucun utilisateur enregistré</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Statut</th>
                <th style={styles.th}>Tentatives échouées</th>
                <th style={styles.th}>Max tentatives</th>
                <th style={styles.th}>Dernière tentative</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.uid} style={styles.tableRow}>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>
                    {user.is_blocked ? (
                      <span style={styles.statusBlocked}>Bloqué</span>
                    ) : (
                      <span style={styles.statusActive}>Actif</span>
                    )}
                  </td>
                  <td style={styles.td}>{user.failed_attempts}</td>
                  <td style={styles.td}>
                    {editingUser === user.uid ? (
                      <div style={styles.editContainer}>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          placeholder="Global"
                          value={customAttempts}
                          onChange={(e) => setCustomAttempts(e.target.value)}
                          style={styles.input}
                        />
                        <button
                          onClick={() => handleSaveMaxAttempts(user.uid)}
                          style={styles.saveBtn}
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={styles.cancelBtn}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={styles.attemptsDisplay}>
                        <span>{getMaxAttemptsDisplay(user)}</span>
                        <button
                          onClick={() => handleEditMaxAttempts(user)}
                          style={styles.editBtn}
                        >
                          ✎
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>{formatDate(user.last_attempt_at)}</td>
                  <td style={styles.td}>
                    {user.is_blocked && (
                      <button
                        onClick={() => handleUnblock(user.uid, user.email)}
                        style={styles.unblockButton}
                      >
                        Débloquer
                      </button>
                    )}
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
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '32px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '24px',
    color: '#333',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '4px',
    marginBottom: '24px',
    fontSize: '14px',
  },
  info: {
    backgroundColor: '#e3f2fd',
    padding: '16px',
    borderRadius: '4px',
    marginBottom: '24px',
  },
  infoText: {
    fontSize: '13px',
    color: '#666',
    marginTop: '8px',
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
    fontSize: '16px',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#f5f5f5',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: '600',
    color: '#555',
    borderBottom: '2px solid #e0e0e0',
  },
  tableRow: {
    borderBottom: '1px solid #f0f0f0',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#333',
  },
  statusBlocked: {
    padding: '4px 8px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  statusActive: {
    padding: '4px 8px',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  attemptsDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  editContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  input: {
    width: '80px',
    padding: '4px 8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '13px',
  },
  editBtn: {
    padding: '2px 8px',
    backgroundColor: 'transparent',
    color: '#1976d2',
    border: '1px solid #1976d2',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '4px 8px',
    backgroundColor: '#4caf50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '4px 8px',
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  unblockButton: {
    padding: '6px 16px',
    backgroundColor: '#4caf50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};

export default AllUsers;