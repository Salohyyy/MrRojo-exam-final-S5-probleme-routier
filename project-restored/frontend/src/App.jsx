import React from 'react';
import MapReports from './components/map/MapReports';
import DashboardStats from './components/stats/DashboardStats';
import { LayoutDashboard } from 'lucide-react';

function App() {
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
        gap: '12px'
      }}>
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

export default App;

