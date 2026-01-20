import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

function FirebaseUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [syncingUser, setSyncingUser] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await adminAPI.getFirebaseUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      showMessage('error', 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSyncUser = async (firebase_uid) => {
    setSyncingUser(firebase_uid);
    try {
      await adminAPI.syncFirebaseUser(firebase_uid, {
        username: null, // Utilisera le displayName ou email
        birth_date: null,
        user_status_id: 1 // Active
      });
      showMessage('success', 'Utilisateur synchronisé avec succès');
      loadUsers();
    } catch (error) {
      console.error('Erreur sync:', error);
      showMessage('error', error.response?.data?.error || 'Erreur lors de la synchronisation');
    } finally {
      setSyncingUser(null);
    }
  };

  const handleSyncAll = async () => {
    if (!confirm('Synchroniser tous les utilisateurs Firebase non synchronisés ?')) {
      return;
    }

    setSyncingAll(true);
    try {
      const response = await adminAPI.syncAllFirebaseUsers();
      showMessage('success', `${response.data.syncedCount} utilisateur(s) synchronisé(s)`);
      loadUsers();
    } catch (error) {
      console.error('Erreur sync all:', error);
      showMessage('error', 'Erreur lors de la synchronisation');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleUpdateMaxAttempts = async (firebase_uid) => {
    const currentUser = users.find(u => u.firebase_uid === firebase_uid);
    const currentValue = currentUser?.maxLoginAttempts || '';
    
    const input = prompt(
      `Nombre de tentatives pour ${currentUser.email}\n(Laisser vide pour utiliser la valeur par défaut)`,
      currentValue
    );

    if (input === null) return;

    const maxAttempts = input === '' ? null : parseInt(input);

    if (maxAttempts !== null && (isNaN(maxAttempts) || maxAttempts < 1 || maxAttempts > 10)) {
      alert('Nombre invalide (doit être entre 1 et 10)');
      return;
    }

    try {
      await adminAPI.updateUserMaxAttempts(firebase_uid, maxAttempts);
      showMessage('success', 'Paramètres mis à jour');
      loadUsers();
    } catch (error) {
      console.error('Erreur:', error);
      showMessage('error', 'Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  const unsyncedUsers = users.filter(u => !u.isSyncedToLocal);
  const syncedUsers = users.filter(u => u.isSyncedToLocal);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Utilisateurs Firebase</h2>
        {unsyncedUsers.length > 0 && (
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            style={styles.syncAllButton}
          >
            {syncingAll ? 'Synchronisation...' : `Synchroniser tout (${unsyncedUsers.length})`}
          </button>
        )}
      </div>

      {message.text && (
        <div style={{
          ...styles.message,
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
        }}>
          {message.text}
        </div>
      )}

      {unsyncedUsers.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Non synchronisés ({unsyncedUsers.length})</h3>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Nom</th>
                  <th style={styles.th}>Créé le</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {unsyncedUsers.map((user) => (
                  <tr key={user.firebase_uid} style={styles.tableRow}>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>{user.displayName || '-'}</td>
                    <td style={styles.td}>{new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleSyncUser(user.firebase_uid)}
                        disabled={syncingUser === user.firebase_uid}
                        style={styles.syncButton}
                      >
                        {syncingUser === user.firebase_uid ? 'Sync...' : 'Synchroniser'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {syncedUsers.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Synchronisés ({syncedUsers.length})</h3>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Nom</th>
                  <th style={styles.th}>ID Local</th>
                  <th style={styles.th}>Max Tentatives</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {syncedUsers.map((user) => (
                  <tr key={user.firebase_uid} style={styles.tableRow}>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>{user.displayName || '-'}</td>
                    <td style={styles.td}>#{user.localUserId}</td>
                    <td style={styles.td}>
                      {user.maxLoginAttempts !== null ? user.maxLoginAttempts : 'Par défaut'}
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleUpdateMaxAttempts(user.firebase_uid)}
                        style={styles.editButton}
                      >
                        Modifier tentatives
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {users.length === 0 && (
        <div style={styles.empty}>Aucun utilisateur Firebase trouvé</div>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
  },
  syncAllButton: {
    padding: '10px 20px',
    backgroundColor: '#2196f3',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '4px',
    marginBottom: '24px',
    fontSize: '14px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#555',
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
  syncButton: {
    padding: '6px 16px',
    backgroundColor: '#4caf50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  editButton: {
    padding: '6px 16px',
    backgroundColor: '#ff9800',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
  },
};

export default FirebaseUsers;