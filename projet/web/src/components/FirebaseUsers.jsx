import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

function FirebaseUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

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

  const handleUpdateMaxAttempts = async (uid, currentEmail) => {
    const currentUser = users.find(u => u.uid === uid);
    const currentValue = currentUser?.customMaxAttempts || '';
    
    const input = prompt(
      `Nombre de tentatives pour ${currentEmail}\n(Laisser vide pour utiliser la valeur par défaut globale)`,
      currentValue
    );

    if (input === null) return; // Annulé

    const maxAttempts = input === '' ? null : parseInt(input);

    if (maxAttempts !== null && (isNaN(maxAttempts) || maxAttempts < 1 || maxAttempts > 10)) {
      alert('Nombre invalide (doit être entre 1 et 10)');
      return;
    }

    try {
      await adminAPI.updateUserMaxAttempts(uid, maxAttempts);
      showMessage('success', 'Paramètres mis à jour avec succès');
      loadUsers();
    } catch (error) {
      console.error('Erreur:', error);
      showMessage('error', error.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return <div style={styles.loading}>Chargement des utilisateurs Firebase...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🔥 Utilisateurs Firebase</h2>
        <button onClick={loadUsers} style={styles.refreshButton}>
          🔄 Actualiser
        </button>
      </div>

      <div style={styles.info}>
        <strong>ℹ️ Information :</strong> Ces utilisateurs sont stockés uniquement dans Firebase. 
        Les paramètres de sécurité sont stockés dans Firebase Firestore.
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

      {users.length === 0 ? (
        <div style={styles.empty}>
          <p>Aucun utilisateur Firebase trouvé</p>
          <p style={styles.emptyHint}>Créez des utilisateurs dans Firebase Console</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Nom</th>
                <th style={styles.th}>Créé le</th>
                <th style={styles.th}>Tentatives max</th>
                <th style={styles.th}>Échecs</th>
                <th style={styles.th}>Statut</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.uid} style={styles.tableRow}>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>{user.displayName || '-'}</td>
                  <td style={styles.td}>
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={styles.td}>
                    {user.customMaxAttempts !== null 
                      ? <strong style={{color: '#ff9800'}}>{user.customMaxAttempts} (personnalisé)</strong>
                      : <span style={{color: '#999'}}>Par défaut</span>
                    }
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      color: user.failedAttempts > 0 ? '#f44336' : '#4caf50'
                    }}>
                      {user.failedAttempts}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {user.isBlocked ? (
                      <span style={styles.blockedBadge}>🚫 Bloqué</span>
                    ) : (
                      <span style={styles.activeBadge}>✅ Actif</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => handleUpdateMaxAttempts(user.uid, user.email)}
                      style={styles.editButton}
                      title="Modifier le nombre de tentatives"
                    >
                      ⚙️ Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={styles.footer}>
        <strong>Total :</strong> {users.length} utilisateur(s) Firebase
      </div>
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
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999',
  },
  emptyHint: {
    fontSize: '14px',
    marginTop: '8px',
    color: '#bbb',
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
    fontSize: '13px',
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
  blockedBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
  },
  activeBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
  },
  editButton: {
    padding: '6px 12px',
    backgroundColor: '#ff9800',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  footer: {
    padding: '12px 16px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#666',
  },
};

export default FirebaseUsers;