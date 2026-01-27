import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

function BlockedUsers() {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      const response = await adminAPI.getBlockedUsers();
      setBlockedUsers(response.data);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      showMessage('error', 'Erreur lors du chargement des utilisateurs bloqués');
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
      loadBlockedUsers();
    } catch (error) {
      console.error('Erreur déblocage:', error);
      showMessage('error', error.response?.data?.error || 'Erreur lors du déblocage');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR');
  };

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🚫 Utilisateurs bloqués</h2>
        <button onClick={loadBlockedUsers} style={styles.refreshButton}>
          🔄 Actualiser
        </button>
      </div>

      <div style={styles.info}>
        <strong>ℹ️ Information :</strong> Les blocages sont stockés dans Firebase Firestore.
        Un utilisateur est bloqué après avoir dépassé le nombre de tentatives autorisées.
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

      {blockedUsers.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>✅</div>
          <p style={styles.emptyText}>Aucun utilisateur bloqué</p>
          <p style={styles.emptyHint}>Tous les utilisateurs peuvent se connecter normalement</p>
        </div>
      ) : (
        <>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Tentatives échouées</th>
                  <th style={styles.th}>Bloqué le</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {blockedUsers.map((user) => (
                  <tr key={user.uid} style={styles.tableRow}>
                    <td style={styles.td}>
                      <strong>{user.email}</strong>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.failedBadge}>{user.failed_attempts}</span>
                    </td>
                    <td style={styles.td}>{formatDate(user.blocked_at)}</td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleUnblock(user.uid, user.email)}
                        style={styles.unblockButton}
                      >
                        🔓 Débloquer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={styles.footer}>
            <strong>Total :</strong> {blockedUsers.length} utilisateur(s) bloqué(s)
          </div>
        </>
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
    marginBottom: '16px',
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
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#2196f3',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  info: {
    padding: '12px 16px',
    backgroundColor: '#fff3e0',
    color: '#e65100',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '4px',
    marginBottom: '24px',
    fontSize: '14px',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '18px',
    color: '#666',
    marginBottom: '8px',
  },
  emptyHint: {
    fontSize: '14px',
    color: '#999',
  },
  tableContainer: {
    overflowX: 'auto',
    marginBottom: '16px',
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
  failedBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
  },
  unblockButton: {
    padding: '8px 16px',
    backgroundColor: '#4caf50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  footer: {
    padding: '12px 16px',
    backgroundColor: '#ffebee',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#c62828',
    fontWeight: '600',
  },
};

export default BlockedUsers;