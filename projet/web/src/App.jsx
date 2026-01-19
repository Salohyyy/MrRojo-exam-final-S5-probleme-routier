import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import Login from './components/Login';
import SessionSettings from './components/SessionSettings';
import BlockedUsers from './components/BlockedUsers';
import ManagerDashboard from './components/ManagerDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        currentUser.getIdToken().then(token => {
          localStorage.setItem('firebaseToken', token);
        });
      }
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    localStorage.removeItem('firebaseToken');
    setActiveTab('dashboard');
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div>Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Gestion Authentification & Signalements</h1>
        <div style={styles.userInfo}>
          <span style={styles.email}>{user.email}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Déconnexion
          </button>
        </div>
      </header>

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            ...styles.tab,
            ...(activeTab === 'dashboard' ? styles.tabActive : {})
          }}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            ...styles.tab,
            ...(activeTab === 'settings' ? styles.tabActive : {})
          }}
        >
          Paramètres
        </button>
        <button
          onClick={() => setActiveTab('blocked')}
          style={{
            ...styles.tab,
            ...(activeTab === 'blocked' ? styles.tabActive : {})
          }}
        >
          Utilisateurs bloqués
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'dashboard' && <ManagerDashboard />}
        {activeTab === 'settings' && <SessionSettings />}
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
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  tabs: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    padding: '0 40px',
    flexWrap: 'wrap',
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
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
};

export default App;