import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authAPI } from '../services/api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Connexion Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      localStorage.setItem('firebaseToken', token);

      // Vérifier les droits admin
      const idTokenResult = await userCredential.user.getIdTokenResult();
      if (!idTokenResult.claims.admin) {
        setError('Vous devez être un employé admin pour accéder à cette interface.');
        await auth.signOut();
        localStorage.removeItem('firebaseToken');
        setLoading(false);
        return;
      }

      // Enregistrer la connexion réussie
      await authAPI.recordSuccessfulLogin();

    } catch (err) {
      console.error('Erreur connexion:', err);
      setError('Email ou mot de passe incorrect, ou vous n\'avez pas les droits admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.badge}>Interface Admin</div>
        <h1 style={styles.title}>Connexion Administrateur</h1>
        <p style={styles.subtitle}>Accès réservé aux employés admin</p>
        
        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="admin@example.com"
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
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div style={styles.infoBox}>
          <strong>ℹ️ Information :</strong>
          <p style={styles.infoText}>
            Seuls les employés avec le rôle "admin" peuvent accéder à cette interface.
            Utilisez le bouton en haut à droite pour tester l'interface utilisateur normale.
          </p>
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
  },
  card: {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  badge: {
    display: 'inline-block',
    backgroundColor: '#ffebee',
    color: '#d32f2f',
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
  infoBox: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#666',
  },
  infoText: {
    marginTop: '8px',
    lineHeight: '1.6',
  },
};

export default Login;