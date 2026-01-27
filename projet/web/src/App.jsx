import React, { useState, useEffect } from 'react';
import { employeeAPI } from './services/api';
import Login from './components/Login';
import UserLogin from './components/UserLogin';
import SessionSettings from './components/SessionSettings';
import BlockedUsers from './components/BlockedUsers';
import FirebaseUsers from './components/FirebaseUsers';

function App() {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
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
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div>Chargement...</div>
      </div>
    );
  }

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
      </div>
    );
  }

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
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
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