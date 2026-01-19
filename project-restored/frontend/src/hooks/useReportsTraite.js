import { useState, useEffect } from 'react';

const useReportsTraite = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // En production Docker, l'API est accessible via /api grâce au proxy Nginx
  const API_URL = '/api';

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔄 Fetching reports from:', `${API_URL}/reports`);

        const response = await fetch(`${API_URL}/reports`);
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Reports fetched:', data);

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

    fetchReports();
  }, [API_URL]);

  return { reports, loading, error };
};

export default useReportsTraite;
