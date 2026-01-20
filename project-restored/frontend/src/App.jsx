import React from 'react';
import MapReports from './components/map/MapReports';
import DashboardStats from './components/stats/DashboardStats';
import ReportSyncs from './components/ReportSyncs';

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f0f2f5' }}>
      
      {/* Header fixe */}
      <header style={{ 
        background: '#fff', padding: '15px 30px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#2c3e50' }}>🚧 Suivi des Travaux Routiers - Tana</h1>
      </header>

      {/* Contenu principal défilant */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        
        {/* Section Statistiques */}
        <section style={{ marginBottom: '20px' }}>
          <DashboardStats />
        </section>

        {/* Section Carte */}
        <section style={{ 
          height: '500px', background: '#fff', borderRadius: '12px', overflow: 'hidden', 
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px', position: 'relative'
        }}>
          <MapReports />
        </section>

        {/* Section Liste Détaillée */}
        <section style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#34495e' }}>Détails des Chantiers</h2>
          <ReportSyncs />
        </section>

      </div>
    </div>
  );
}

export default App;

