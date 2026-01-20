import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

function SessionSettings() {
  const [settings, setSettings] = useState(null);
  const [sessionDuration, setSessionDuration] = useState('');
  const [maxAttempts, setMaxAttempts] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await adminAPI.getSettings();
      setSettings(response.data);
      setSessionDuration(response.data.session_duration_minutes);
      setMaxAttempts(response.data.default_max_login_attempts);
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
      showMessage('error', 'Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleUpdateSessionDuration = async (e) => {
    e.preventDefault();
    const minutes = parseInt(sessionDuration);
    
    if (minutes < 1 || minutes > 1440) {
      showMessage('error', 'Durée invalide (1-1440 minutes)');
      return;
    }

    try {
      await adminAPI.updateSessionDuration(minutes);
      showMessage('success', 'Durée de session mise à jour avec succès');
      loadSettings();
    } catch (error) {
      console.error('Erreur:', error);
      showMessage('error', error.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  const handleUpdateMaxAttempts = async (e) => {
    e.preventDefault();
    const attempts = parseInt(maxAttempts);
    
    if (attempts < 1 || attempts > 10) {
      showMessage('error', 'Nombre invalide (1-10 tentatives)');
      return;
    }

    try {
      await adminAPI.updateDefaultMaxAttempts(attempts);
      showMessage('success', 'Nombre de tentatives mis à jour avec succès');
      loadSettings();
    } catch (error) {
      console.error('Erreur:', error);
      showMessage('error', error.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 
      ? `${hours} heure${hours > 1 ? 's' : ''}`
      : `${hours}h ${mins}min`;
  };

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Paramètres de sécurité globaux</h2>

      {message.text && (
        <div style={{
          ...styles.message,
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
        }}>
          {message.text}
        </div>
      )}

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Durée de vie des sessions</h3>
        <p style={styles.description}>
          Durée d'inactivité avant déconnexion automatique (en minutes)
        </p>
        <form onSubmit={handleUpdateSessionDuration} style={styles.form}>
          <div style={styles.inputGroup}>
            <input
              type="number"
              min="1"
              max="1440"
              value={sessionDuration}
              onChange={(e) => setSessionDuration(e.target.value)}
              style={styles.input}
              required
            />
            <span style={styles.unit}>minutes</span>
          </div>
          <button type="submit" style={styles.button}>
            Mettre à jour
          </button>
        </form>
        {settings && (
          <div style={styles.currentValue}>
            Valeur actuelle : {formatDuration(settings.session_duration_minutes)}
          </div>
        )}
        <div style={styles.hint}>
          💡 Exemples : 5 min, 30 min, 60 min (1h), 1440 min (24h)
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Nombre maximum de tentatives de connexion (par défaut)</h3>
        <p style={styles.description}>
          Nombre de tentatives échouées autorisées avant le blocage du compte (par défaut pour tous les utilisateurs)
        </p>
        <form onSubmit={handleUpdateMaxAttempts} style={styles.form}>
          <div style={styles.inputGroup}>
            <input
              type="number"
              min="1"
              max="10"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(e.target.value)}
              style={styles.input}
              required
            />
            <span style={styles.unit}>tentatives</span>
          </div>
          <button type="submit" style={styles.button}>
            Mettre à jour
          </button>
        </form>
        {settings && (
          <div style={styles.currentValue}>
            Valeur actuelle : {settings.default_max_login_attempts} tentatives
          </div>
        )}
        <div style={styles.hint}>
          💡 Cette valeur est utilisée par défaut. Vous pouvez personnaliser par utilisateur dans l'onglet "Utilisateurs Firebase".
        </div>
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
  section: {
    marginBottom: '32px',
    paddingBottom: '32px',
    borderBottom: '1px solid #e0e0e0',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#333',
  },
  description: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '16px',
  },
  form: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-end',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    width: '120px',
  },
  unit: {
    fontSize: '14px',
    color: '#666',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  currentValue: {
    marginTop: '12px',
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic',
  },
  hint: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#999',
  },
};

export default SessionSettings;