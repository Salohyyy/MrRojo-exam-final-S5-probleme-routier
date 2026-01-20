import React, { useState, useEffect } from 'react';

const DashboardStats = () => {
  const [stats, setStats] = useState({
    totalBudget: 0,
    totalWorks: 0,
    completedWorks: 0,
    inProgressWorks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/report-syncs');
        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          const reportSyncs = data.data;
          
          const totalBudget = reportSyncs.reduce((acc, curr) => acc + parseFloat(curr.budget || 0), 0);
          const totalWorks = reportSyncs.length;
          const completedWorks = reportSyncs.filter(r => r.status === 'Terminé').length;
          const inProgressWorks = reportSyncs.filter(r => r.status === 'En cours').length;

          setStats({
            totalBudget,
            totalWorks,
            completedWorks,
            inProgressWorks
          });
        }
      } catch (error) {
        console.error('Erreur chargement statistiques:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div className="p-4">Chargement des statistiques...</div>;

  return (
    <div className="stats-container" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      padding: '1rem',
      backgroundColor: '#f8f9fa',
      marginBottom: '1rem',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div className="stat-card" style={cardStyle}>
        <h3>Budget Total</h3>
        <p style={valueStyle}>{stats.totalBudget.toLocaleString()} Ar</p>
      </div>
      <div className="stat-card" style={cardStyle}>
        <h3>Chantiers</h3>
        <p style={valueStyle}>{stats.totalWorks}</p>
      </div>
      <div className="stat-card" style={cardStyle}>
        <h3>En Cours</h3>
        <p style={valueStyle}>{stats.inProgressWorks}</p>
      </div>
      <div className="stat-card" style={cardStyle}>
        <h3>Terminés</h3>
        <p style={valueStyle}>{stats.completedWorks}</p>
      </div>
    </div>
  );
};

const cardStyle = {
  backgroundColor: 'white',
  padding: '1rem',
  borderRadius: '4px',
  textAlign: 'center',
  border: '1px solid #dee2e6'
};

const valueStyle = {
  fontSize: '1.5rem',
  fontWeight: 'bold',
  color: '#007bff',
  margin: '0.5rem 0 0 0'
};

export default DashboardStats;
