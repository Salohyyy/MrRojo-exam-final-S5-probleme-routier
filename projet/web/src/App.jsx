import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import Login from './components/Login';
import SessionSettings from './components/SessionSettings';
import BlockedUsers from './components/BlockedUsers';
import ManagerDashboard from './components/ManagerDashboard';
import MapReports from './components/map/MapReports';
import DashboardStats from './components/stats/DashboardStats';
import { LayoutDashboard } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState('login'); // 'login', 'visitor', 'admin'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        currentUser.getIdToken().then(token => {
          localStorage.setItem('firebaseToken', token);
        });
        setViewMode('admin');
      } else {
        if (viewMode !== 'visitor') {
           setViewMode('login');
        }
      }
    });

    return unsubscribe;
  }, [viewMode]);

  const handleLogout = async () => {
    await auth.signOut();
    localStorage.removeItem('firebaseToken');
    setActiveTab('dashboard');
    setViewMode('login');
  };

  const handleVisitorClick = () => {
    setViewMode('visitor');
  };

  const handleBackToLogin = () => {
    setViewMode('login');
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div>Chargement...</div>
      </div>
    );
  }

  // Visitor View
  if (viewMode === 'visitor') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#f0f2f5' }}>
        {/* Header */}
        <header style={{ 
          padding: '1rem 2rem', 
          backgroundColor: 'white', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)', 
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', background: '#3498db', borderRadius: '8px', color: 'white' }}>
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#2c3e50', fontWeight: '700' }}>
                Portail des Infrastructures Routières
              </h1>
              <span style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                Antananarivo, Madagascar
              </span>
            </div>
          </div>
          <button onClick={handleBackToLogin} style={{
             padding: '8px 16px',
             borderRadius: '6px',
             border: '1px solid #ddd',
             backgroundColor: 'white',
             cursor: 'pointer',
             fontWeight: '500'
          }}>
            Connexion
          </button>
        </header>

        {/* Stats Section */}
        <div style={{ 
          flex: '0 0 auto', 
          zIndex: 10,
          padding: '1rem 2rem 0 2rem'
        }}>
          <DashboardStats />
        </div>

        {/* Map Section */}
        <div style={{ 
          flex: '1', 
          position: 'relative', 
          margin: '1rem 2rem 2rem 2rem',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <MapReports />
        </div>
      </div>
    );
  }

  // Admin/Manager View
  if (user) {
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

  // Login View
  return <Login onVisitorClick={handleVisitorClick} />;
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
  },
  loading: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    color: '#666',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: '1rem 2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    color: '#2c3e50',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  email: {
    color: '#666',
    fontWeight: '500',
  },
  logoutBtn: {
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'background-color 0.2s',
  },
  tabs: {
    display: 'flex',
    gap: '1rem',
    padding: '0 2rem',
    marginBottom: '2rem',
    borderBottom: '1px solid #e0e0e0',
  },
  tab: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#666',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#3498db',
    borderBottom: '2px solid #3498db',
    fontWeight: '600',
  },
  content: {
    padding: '0 2rem 2rem 2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
};

export default App;
