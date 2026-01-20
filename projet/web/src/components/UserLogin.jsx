import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authAPI } from '../services/api';

function UserLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);

  useEffect(() => {
    // Vérifier l'état de la session au chargement
    const checkCurrentSession = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const response = await authAPI.checkSession();
          setSessionInfo(response.data);
        } catch (err) {
          // Session expirée, déconnexion automatique
          await auth.signOut();
          localStorage.removeItem('firebaseToken');
        }
      }
    };

    checkCurrentSession();

    // Vérifier périodiquement la session
    const interval = setInterval(async () => {
      if (auth.currentUser) {
        try {
          const response = await authAPI.checkSession();
          setSessionInfo(response.data);
        } catch (err) {
          if (err.response?.data?.expired) {
            await auth.signOut();
            localStorage.removeItem('firebaseToken');
            setError('Session expirée. Veuillez vous reconnecter.');
            setSessionInfo(null);
          }
        }
      }
    }, 30000); // Vérifier toutes les 30 secondes

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // 1. Vérifier les tentatives avant de se connecter
      const checkResponse = await authAPI.checkAttempts(email);
      
      if (!checkResponse.data.canLogin) {
        setError(checkResponse.data.error);
        setLoading(false);
        return;
      }

      setAttemptsLeft(checkResponse.data.attemptsLeft);

      // 2. Tenter la connexion Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      localStorage.setItem('firebaseToken', token);

      // 3. Enregistrer la connexion réussie
      const loginResponse = await authAPI.recordSuccessfulLogin();
      setSessionInfo({
        expiresAt: loginResponse.data.sessionExpiresAt,
        remainingMinutes: loginResponse.data.sessionDurationMinutes
      });

      setSuccess(`✅ Connexion réussie ! Session valide pour ${loginResponse.data.sessionDurationMinutes} minutes.`);
      setAttemptsLeft(null);

    } catch (err) {
      console.error('Erreur connexion:', err);
      
      // Enregistrer la tentative échouée
      try {
        const failResponse = await authAPI.recordFailedAttempt(email);
        
        if (failResponse.data.blocked) {
          setError(`❌ ${failResponse.data.message}`);
          setAttemptsLeft(0);
        } else {
          setError(`❌ Identifiants incorrects. ${failResponse.data.attemptsLeft} tentative(s) restante(s).`);
          setAttemptsLeft(failResponse.data.attemptsLeft);
        }
      } catch (apiErr) {
        setError('❌ Email ou mot de passe incorrect.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    localStorage.removeItem('firebaseToken');
    setSessionInfo(null);
    setSuccess('');
    setEmail('');
    setPassword('');
  };

  const formatExpirationTime = () => {
    if (!sessionInfo?.expiresAt) return '';
    const expiresAt = new Date(sessionInfo.expiresAt);
    return expiresAt.toLocaleTimeString('fr-FR');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.badge}>Interface Utilisateur</div>
        <h1 style={styles.title}>Connexion Utilisateur</h1>
        <p style={styles.subtitle}>Test de l'authentification et des paramètres de sécurité</p>
        
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}
        
        {attemptsLeft !== null && !error && !success && (
          <div style={styles.info}>
            ⚠️ Tentatives restantes : <strong>{attemptsLeft}</strong>
          </div>
        )}

        {sessionInfo && (
          <div style={styles.sessionInfo}>
            <div style={styles.sessionHeader}>📊 Session active</div>
            <div style={styles.sessionDetail}>
              <span>Expire à :</span>
              <strong>{formatExpirationTime()}</strong>
            </div>
            <div style={styles.sessionDetail}>
              <span>Temps restant :</span>
              <strong>{sessionInfo.remainingMinutes} minute(s)</strong>
            </div>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Se déconnecter
            </button>
          </div>
        )}

        {!sessionInfo && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="utilisateur@example.com"
                required
                disabled={loading}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              style={styles.button}
              disabled={loading}
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>
        )}

        <div style={styles.infoBox}>
          <strong>💡 Cette interface permet de tester :</strong>
          <ul style={styles.infoList}>
            <li>Les tentatives de connexion limitées</li>
            <li>Le blocage automatique après X tentatives</li>
            <li>La durée de session personnalisée</li>
            <li>La déconnexion automatique à l'expiration</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  card: {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '500px',
  },
  badge: {
    display: 'inline-block',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#333',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '24px',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  success: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  info: {
    backgroundColor: '#fff3e0',
    color: '#e65100',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  sessionInfo: {
    backgroundColor: '#f5f5f5',
    padding: '16px',
    borderRadius: '8px',
    marginTop: '16px',
  },
  sessionHeader: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#333',
  },
  sessionDetail: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#666',
  },
  logoutBtn: {
    marginTop: '12px',
    width: '100%',
    padding: '10px',
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#555',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  button: {
    padding: '12px',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '8px',
  },
  infoBox: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#666',
  },
  infoList: {
    marginTop: '8px',
    marginLeft: '20px',
    lineHeight: '1.8',
  },
};

export default UserLogin;