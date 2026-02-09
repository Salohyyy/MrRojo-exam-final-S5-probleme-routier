// hooks/useReportPhotos.js
import { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';

const useReportPhotos = (reportId) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!reportId) return;

    const fetchPhotos = async () => {
      setLoading(true);
      try {
        const response = await reportsAPI.getReportPhotos(reportId);
        setPhotos(response.data?.data?.photos || response.data?.photos || []);
      } catch (err) {
        setError(err.message);
        console.error('Erreur chargement photos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [reportId]);

  return { photos, loading, error };
};

export default useReportPhotos;