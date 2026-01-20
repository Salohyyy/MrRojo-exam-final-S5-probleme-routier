import React from 'react';
import MapReports from './components/map/MapReports';
import DashboardStats from './components/stats/DashboardStats';

function App() {
  return (
    <div>
      <h1>Carte des problèmes routiers</h1>
      <DashboardStats />
      <MapReports />
    </div>
  );
}

export default App;

