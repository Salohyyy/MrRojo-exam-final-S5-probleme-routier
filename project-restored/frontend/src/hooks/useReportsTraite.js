import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';

function useReportsTraite() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'reports_traite'));

    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('reports_traite snapshot size:', items.length);
        setReports(items);
        setLoading(false);
      },
      err => {
        console.error(err);
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { reports, loading, error };
}

export default useReportsTraite;
