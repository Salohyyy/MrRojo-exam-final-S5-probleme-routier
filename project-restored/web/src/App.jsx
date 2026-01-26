import React, { useState } from 'react';
import ReportSyncs from './ReportSyncs';

function App() {
  return (
    <div>
      <nav style={styles.nav}>
        <div style={styles.navBrand}>
          <h2 style={styles.brandTitle}>🚗 Problèmes Routiers</h2>
          <p style={styles.brandSubtitle}>Madagascar</p>
        </div>
      </nav>

      <main>
        <ReportSyncs />
      </main>
    </div>
  );
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    backgroundColor: '#2c3e50',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    color: 'white'
  },
  navBrand: {
    display: 'flex',
    flexDirection: 'column'
  },
  brandTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold'
  },
  brandSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    opacity: 0.8
  }
};

export default App;