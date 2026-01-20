import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import Login from './components/Login';
import SessionSettings from './components/SessionSettings';
import BlockedUsers from './components/BlockedUsers';
import FirebaseUsers from './components/FirebaseUsers';
import UserLogin from './components/UserLogin';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('settings');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUserInterface, setShowUserInterface] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        const token = await currentUser.getIdToken();
        localStorage.setItem('firebaseToken', token);
        
        // Vérifier si l'utilisateur a les droits admin
        const idTokenResult = await currentUser.getIdTokenResult();
        setIsAdmin(idTokenResult.claims.admin === true);
      } else {
        setIsAdmin(false);
      }
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    localStorage.removeItem('firebaseToken');
    setShowUserInterface(false);
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div>Chargement...</div>
      </div>
    );
  }

  // Interface utilisateur pour tester la connexion
  if (showUserInterface || (!user && !isAdmin)) {
    return (
      <div>
        <div style={styles.switchButton}>
          <button 
            onClick={() => setShowUserInterface(!showUserInterface)}
            style={styles.switchBtn}
          >
            {showUserInterface ? '🔐 Interface Admin' : '👤 Interface Utilisateur (Test)'}
          </button>
        </div>
        {showUserInterface ? <UserLogin /> : <Login />}
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!isAdmin) {
    return (
      <div style={styles.accessDenied}>
        <div style={styles.accessDeniedCard}>
          <h1 style={styles.accessDeniedTitle}>❌ Accès refusé</h1>
          <p style={styles.accessDeniedText}>
            Vous devez être un employé admin pour accéder à cette interface.
          </p>
          <p style={styles.accessDeniedInfo}>
            Connecté en tant que : <strong>{user.email}</strong>
          </p>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>🔐 Administration - Gestion Authentification</h1>
          <span style={styles.adminBadge}>ADMIN</span>
        </div>
        <div style={styles.userInfo}>
          <span style={styles.email}>{user.email}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Déconnexion
          </button>
        </div>
      </header>

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            ...styles.tab,
            ...(activeTab === 'settings' ? styles.tabActive : {})
          }}
        >
          ⚙️ Paramètres globaux
        </button>
        <button
          onClick={() => setActiveTab('firebase-users')}
          style={{
            ...styles.tab,
            ...(activeTab === 'firebase-users' ? styles.tabActive : {})
          }}
        >
          👥 Utilisateurs Firebase
        </button>
        <button
          onClick={() => setActiveTab('blocked')}
          style={{
            ...styles.tab,
            ...(activeTab === 'blocked' ? styles.tabActive : {})
          }}
        >
          🚫 Utilisateurs bloqués
        </button>
        <button
          onClick={() => setShowUserInterface(true)}
          style={styles.testButton}
        >
          🧪 Tester interface utilisateur
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'settings' && <SessionSettings />}
        {activeTab === 'firebase-users' && <FirebaseUsers />}
        {activeTab === 'blocked' && <BlockedUsers />}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '18px',
    color: '#666',
  },
  switchButton: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1000,
  },
  switchBtn: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    color: '#1976d2',
    border: '2px solid #1976d2',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  accessDenied: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  accessDeniedCard: {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center',
    maxWidth: '500px',
  },
  accessDeniedTitle: {
    fontSize: '24px',
    marginBottom: '16px',
    color: '#d32f2f',
  },
  accessDeniedText: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '16px',
  },
  accessDeniedInfo: {
    fontSize: '14px',
    color: '#999',
    marginBottom: '24px',
  },
  header: {
    backgroundColor: '#fff',
    padding: '20px 40px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#333',
    display: 'inline-block',
    marginRight: '12px',
  },
  adminBadge: {
    display: 'inline-block',
    backgroundColor: '#ff5722',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  email: {
    color: '#666',
    fontSize: '14px',
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  logoutBtn: {
    padding: '12px 24px',
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  tabs: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    padding: '0 40px',
    gap: '8px',
  },
  tab: {
    padding: '16px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#1976d2',
    borderBottomColor: '#1976d2',
  },
  testButton: {
    marginLeft: 'auto',
    padding: '16px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#4caf50',
  },
  content: {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
};

export default App;