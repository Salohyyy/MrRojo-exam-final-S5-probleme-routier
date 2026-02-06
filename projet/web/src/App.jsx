import React, { useState, useEffect } from 'react';
import { employeeAPI } from './services/api';
import Login from './components/Login';
import UserLogin from './components/UserLogin';
import SessionSettings from './components/SessionSettings';
import BlockedUsers from './components/BlockedUsers';
<<<<<<< HEAD
import ManagerDashboard from './components/ManagerDashboard';
import MapReports from './components/map/MapReports';
import DashboardStats from './components/stats/DashboardStats';
import ReportSyncs from './components/ReportSyncs';
import { LayoutDashboard } from 'lucide-react';
=======
import FirebaseUsers from './components/FirebaseUsers';
>>>>>>> origin/espace-employe-fonctionnel

function App() {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState('login'); // 'login', 'visitor', 'admin'
  const [visitorView, setVisitorView] = useState('map'); // 'map', 'table'

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
=======
  const [activeTab, setActiveTab] = useState('settings');
  const [showUserInterface, setShowUserInterface] = useState(false);

  useEffect(() => {
    checkEmployeeAuth();
  }, []);

  const checkEmployeeAuth = async () => {
    const token = localStorage.getItem('employeeToken');
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await employeeAPI.verify();
      setEmployee(response.data.employee);
    } catch (error) {
      console.error('Token invalide:', error);
      localStorage.removeItem('employeeToken');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (employeeData) => {
    setEmployee(employeeData);
  };

  const handleLogout = () => {
    localStorage.removeItem('employeeToken');
    setEmployee(null);
    setShowUserInterface(false);
>>>>>>> origin/espace-employe-fonctionnel
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div>Chargement...</div>
      </div>
    );
  }

<<<<<<< HEAD
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
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setVisitorView(visitorView === 'map' ? 'table' : 'map')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #3498db',
                backgroundColor: visitorView === 'map' ? 'white' : '#3498db',
                color: visitorView === 'map' ? '#3498db' : 'white',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {visitorView === 'map' ? '📊 Voir tableau récap' : '🗺️ Voir la carte'}
            </button>
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
          </div>
        </header>

        {visitorView === 'map' ? (
          <>
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
          </>
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <ReportSyncs readOnly={true} />
          </div>
        )}
=======
  // Afficher l'interface utilisateur (test Firebase)
  if (showUserInterface) {
    return (
      <div>
        <div style={styles.switchButtonContainer}>
          <button 
            onClick={() => setShowUserInterface(false)}
            style={styles.switchButton}
          >
            🔙 Retour interface Admin
          </button>
        </div>
        <UserLogin />
>>>>>>> origin/espace-employe-fonctionnel
      </div>
    );
  }

<<<<<<< HEAD
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
          <button
            onClick={() => setActiveTab('map')}
            style={{
              ...styles.tab,
              ...(activeTab === 'map' ? styles.tabActive : {})
            }}
          >
            Carte
          </button>
          <button
            onClick={() => setActiveTab('report-syncs')}
            style={{
              ...styles.tab,
              ...(activeTab === 'report-syncs' ? styles.tabActive : {})
            }}
          >
            Suivi Chantiers
=======
  // Si pas connecté, afficher le login employé
  if (!employee) {
    return (
      <div>
        <div style={styles.switchButtonContainer}>
          <button 
            onClick={() => setShowUserInterface(true)}
            style={styles.switchButton}
          >
            👤 Interface Utilisateur (Test)
          </button>
        </div>
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Vérifier le rôle admin
  if (employee.role !== 'admin') {
    return (
      <div style={styles.accessDenied}>
        <div style={styles.accessDeniedCard}>
          <h1 style={styles.accessDeniedTitle}>❌ Accès refusé</h1>
          <p style={styles.accessDeniedText}>
            Seuls les employés avec le rôle "admin" peuvent accéder à cette interface.
          </p>
          <p style={styles.accessDeniedInfo}>
            Connecté en tant que : <strong>{employee.username}</strong> ({employee.role})
          </p>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  // Interface admin
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>🔐 Administration - Gestion Authentification</h1>
          <span style={styles.adminBadge}>ADMIN</span>
          <span style={styles.localBadge}>Authentification locale</span>
        </div>
        <div style={styles.userInfo}>
          <span style={styles.username}>👤 {employee.username}</span>
          <span style={styles.email}>{employee.email}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Déconnexion
>>>>>>> origin/espace-employe-fonctionnel
          </button>
        </div>

<<<<<<< HEAD
        <div style={styles.content}>
          {activeTab === 'dashboard' && <ManagerDashboard />}
          {activeTab === 'settings' && <SessionSettings />}
          {activeTab === 'blocked' && <BlockedUsers />}
          {activeTab === 'map' && (
            <div style={{ height: 'calc(100vh - 200px)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <MapReports 
                showAdminButton={true} 
                onAdminButtonClick={() => setActiveTab('report-syncs')} 
              />
            </div>
          )}
          {activeTab === 'report-syncs' && <ReportSyncs />}
        </div>
=======
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
          🔥 Utilisateurs Firebase
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
>>>>>>> origin/espace-employe-fonctionnel
      </div>
    );
  }

<<<<<<< HEAD
  // Login View
  return <Login onVisitorClick={handleVisitorClick} />;
=======
      <div style={styles.content}>
        {activeTab === 'settings' && <SessionSettings />}
        {activeTab === 'firebase-users' && <FirebaseUsers />}
        {activeTab === 'blocked' && <BlockedUsers />}
      </div>
    </div>
  );
>>>>>>> origin/espace-employe-fonctionnel
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
  switchButtonContainer: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1000,
  },
  switchButton: {
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
<<<<<<< HEAD
    margin: 0,
    fontSize: '1.5rem',
    color: '#2c3e50',
=======
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
    marginRight: '8px',
  },
  localBadge: {
    display: 'inline-block',
    backgroundColor: '#4caf50',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
>>>>>>> origin/espace-employe-fonctionnel
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
<<<<<<< HEAD
    gap: '1rem',
  },
  email: {
    color: '#666',
    fontWeight: '500',
  },
  logoutBtn: {
    backgroundColor: '#e74c3c',
    color: 'white',
=======
    gap: '16px',
  },
  username: {
    color: '#333',
    fontSize: '14px',
    fontWeight: '600',
  },
  email: {
    color: '#666',
    fontSize: '13px',
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#f44336',
    color: '#fff',
>>>>>>> origin/espace-employe-fonctionnel
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'background-color 0.2s',
  },
  tabs: {
    display: 'flex',
<<<<<<< HEAD
    gap: '1rem',
    padding: '0 2rem',
    marginBottom: '2rem',
    borderBottom: '1px solid #e0e0e0',
=======
    padding: '0 40px',
    gap: '8px',
>>>>>>> origin/espace-employe-fonctionnel
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
    padding: '0 2rem 2rem 2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
};

export default App;
