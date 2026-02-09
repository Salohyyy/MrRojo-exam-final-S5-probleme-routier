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
        // En attendant que le backend soit 100% synchronisé, on utilise Firebase (via API reports)
        // pour que les stats ne soient pas à zéro
        const response = await fetch('/api/visitor/reports'); // Updated URL to point to visitor route
        const data = await response.json();

        if (data.success) {
          const reports = data.data;
          
          // Calcul basé sur les données Firebase
          // Note: Dans Firebase, 'budget' et 'progress' peuvent ne pas exister pour tous les rapports
          const totalBudget = reports.reduce((acc, curr) => acc + parseFloat(curr.budget || 0), 0);
          const totalWorks = reports.length; // Total des signalements
          const completedWorks = reports.filter(r => r.status === 'Terminé' || (r.progress && r.progress === 100)).length;
          const inProgressWorks = reports.filter(r => r.status === 'En cours' || (r.progress && r.progress > 0 && r.progress < 100)).length;

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
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '1.5rem',
      marginBottom: '0',
    }}>
      <StatCard 
        title="Budget Total" 
        value={`${stats.totalBudget.toLocaleString()} Ar`} 
        icon="💰" 
        color="#2ecc71"
      />
      <StatCard 
        title="Signalements" 
        value={stats.totalWorks} 
        icon="📢" 
        color="#3498db"
      />
      <StatCard 
        title="En Cours" 
        value={stats.inProgressWorks} 
        icon="🚧" 
        color="#f1c40f"
      />
      <StatCard 
        title="Terminés" 
        value={stats.completedWorks} 
        icon="✅" 
        color="#9b59b6"
      />
    </div>
  );
};

const StatCard = ({ title, value, icon, color }) => (
  <div style={{
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
    border: '1px solid rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    transition: 'transform 0.2s ease',
    cursor: 'default'
  }}
  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <div style={{
      width: '48px',
      height: '48px',
      borderRadius: '10px',
      backgroundColor: `${color}15`,
      color: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.5rem'
    }}>
      {icon}
    </div>
    <div>
      <h3 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#2c3e50' }}>{value}</p>
    </div>
  </div>
);

export default DashboardStats;
