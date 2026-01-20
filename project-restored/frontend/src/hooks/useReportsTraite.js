import { useState, useEffect } from 'react';

const useReportsTraite = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // En production Docker, l'API est accessible via /api grâce au proxy Nginx
  const API_URL = '/api';

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching reports from:', `${API_URL}/reports`);

      // On récupère maintenant les données depuis PostgreSQL (via l'API mise à jour)
      const response = await fetch(`${API_URL}/reports/postgres`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Reports fetched:', data);

      if (data.success && Array.isArray(data.data)) {
        setReports(data.data);
      } else {
        console.warn('⚠️ Format de données inattendu:', data);
        setReports([]); // Fallback sur un tableau vide
        if (!data.success) throw new Error(data.message || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      setError(err.message);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Fonction pour mettre à jour le statut (Manager)
  const updateStatus = async (syncId, statusId, progress) => {
    if (!syncId) {
      console.error("❌ Impossible de mettre à jour : Aucun ID de synchronisation (sync_id)");
      return;
    }

    try {
      console.log(`🔄 Updating status for sync #${syncId}...`);
      const response = await fetch(`${API_URL}/report-syncs/${syncId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: statusId, progress })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Mise à jour réussie !');
        fetchReports(); // Rafraîchir la liste
        return data.data;
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      console.error('❌ Erreur updateStatus:', err);
      throw err;
    }
  };

  return { reports, loading, error, updateStatus, refetch: fetchReports };
};

export default useReportsTraite;
