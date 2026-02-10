import { useState, useEffect } from 'react';

const useReportsTraite = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // En production Docker, l'API est accessible via /api grâce au proxy Nginx
  const API_URL = '/api/visitor'; // Updated to point to visitor routes prefix

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching reports from:', `${API_URL}/reports`);

      // On récupère les données depuis Firebase (via l'API originale)
      const response = await fetch(`${API_URL}/reports`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log(' Reports fetched:', data);

      if (data.success) {
        setReports(data.data);
      } else {
        throw new Error(data.message || 'Erreur lors de la récupération des données');
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
      const response = await fetch(`/api/manager/report-syncs/${syncId}/status`, { // Updated to point to manager routes
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: statusId, progress })
      });

      const data = await response.json();

      if (data.success) {
        console.log(' Mise à jour réussie !');
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
