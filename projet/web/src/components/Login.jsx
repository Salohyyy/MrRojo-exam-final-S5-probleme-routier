import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authAPI } from '../services/api';

function Login({ onVisitorClick }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Vérifier les tentatives avant de se connecter
      const checkResponse = await authAPI.checkAttempts(email);

      if (!checkResponse.data.canLogin) {
        setError(checkResponse.data.error);
        setLoading(false);
        return;
      }

      setAttemptsLeft(checkResponse.data.attemptsLeft);

      // Tenter la connexion Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      localStorage.setItem('firebaseToken', token);

      // Enregistrer la connexion réussie
      await authAPI.recordSuccessfulLogin();

    } catch (err) {
      console.error('Erreur connexion:', err);

      // Enregistrer la tentative échouée
      try {
        const failResponse = await authAPI.recordFailedAttempt(email);

        if (failResponse.data.blocked) {
          setError(failResponse.data.message);
        } else {
          setError(`Identifiants incorrects. ${failResponse.data.attemptsLeft} tentative(s) restante(s).`);
          setAttemptsLeft(failResponse.data.attemptsLeft);
        }
      } catch (apiErr) {
        setError('Email ou mot de passe incorrect.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Connexion</h1>

        {error && <div style={styles.error}>{error}</div>}

        {attemptsLeft !== null && !error && (
          <div style={styles.info}>
            Tentatives restantes : {attemptsLeft}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
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
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            style={styles.button}
            disabled={loading}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
          
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <span style={{ color: '#666', fontSize: '0.9rem' }}>Ou </span>
            <button 
              type="button" 
              onClick={onVisitorClick}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#3498db', 
                textDecoration: 'underline', 
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Visiter le site sans connexion
            </button>
          </div>
        </form>
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
  },
  card: {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '24px',
    textAlign: 'center',
    color: '#333',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  info: {
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
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
};

export default Login;