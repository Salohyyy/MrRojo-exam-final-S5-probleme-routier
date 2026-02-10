// src/hooks/useFirebaseReportPhotos.js (renommez-le pour plus de clarté)
import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const useFirebaseReportPhotos = (firebaseReportId) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!firebaseReportId || typeof firebaseReportId !== 'string' || firebaseReportId.trim() === '') {
      setPhotos([]);
      return;
    }

    const fetchPhotos = async () => {
      setLoading(true);
      try {
        let photosData = [];
        
        console.log(`Fetching photos for Firebase ID: ${firebaseReportId}`);
        
        // Essayer d'abord dans reports_traites_photos (rapports traités)
        try {
          const treatedPhotosRef = collection(db, 'reports_traites_photos');
          const treatedPhotosQuery = query(treatedPhotosRef, where('report_id', '==', firebaseReportId));
          const treatedPhotosSnapshot = await getDocs(treatedPhotosQuery);
          
          if (!treatedPhotosSnapshot.empty) {
            console.log(`Found ${treatedPhotosSnapshot.size} photos in reports_traites_photos`);
            photosData = treatedPhotosSnapshot.docs.map(doc => ({
              id: doc.id,
              firebase_id: doc.id,
              photo_base64: doc.data().photo_base64,
              mime_type: doc.data().mime_type || 'image/jpeg',
              uploaded_at: doc.data().uploaded_at?.toDate() || new Date(),
              source: 'treated'
            }));
          }
        } catch (treatedError) {
          console.warn('Error fetching from reports_traites_photos:', treatedError);
        }

        // Si pas de photos dans reports_traites_photos, essayer dans les rapports originaux
        if (photosData.length === 0) {
          try {
            const originalReportRef = doc(db, 'reports', firebaseReportId);
            const originalReportDoc = await getDoc(originalReportRef);
            
            if (originalReportDoc.exists()) {
              const reportData = originalReportDoc.data();
              if (reportData.photos && Array.isArray(reportData.photos)) {
                console.log(`Found ${reportData.photos.length} photos in original report`);
                photosData = reportData.photos.map((photoBase64, index) => {
                  // Nettoyer le base64 si nécessaire
                  let cleanBase64 = photoBase64;
                  if (typeof photoBase64 === 'string' && photoBase64.includes('base64,')) {
                    cleanBase64 = photoBase64.split('base64,')[1];
                  }
                  
                  return {
                    id: `${firebaseReportId}_photo_${index}`,
                    firebase_id: `${firebaseReportId}_photo_${index}`,
                    photo_base64: cleanBase64,
                    mime_type: 'image/jpeg',
                    uploaded_at: reportData.reported_at?.toDate() || new Date(),
                    source: 'original'
                  };
                });
              }
            }
          } catch (originalError) {
            console.warn('Error fetching from original reports:', originalError);
          }
        }

        // Formater les photos pour l'affichage
        const formattedPhotos = photosData
          .filter(photo => photo.photo_base64 && typeof photo.photo_base64 === 'string')
          .map(photo => ({
            ...photo,
            full_base64: photo.photo_base64.startsWith('data:')
              ? photo.photo_base64
              : `data:${photo.mime_type};base64,${photo.photo_base64}`
          }));

        console.log(`Formatted ${formattedPhotos.length} photos for display`);
        setPhotos(formattedPhotos);
        
      } catch (err) {
        setError(err.message);
        console.error('Erreur chargement photos Firebase:', err);
        setPhotos([]); // Retourner un tableau vide en cas d'erreur
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [firebaseReportId]);

  return { photos, loading, error };
};

export default useFirebaseReportPhotos;