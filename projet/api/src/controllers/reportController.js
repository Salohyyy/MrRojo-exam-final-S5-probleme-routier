const pool = require('../config/database');
const { db } = require('../config/firebase');
const admin = require('firebase-admin');
const { syncUserToPostgres, syncDownload, syncUpload } = require('../utils/syncHelper');
const reportSyncModel = require('../models/reportSyncModel');
const reportPhotosModel = require('../models/ReportPhotosModel');
const { use } = require('../routes/employeeAuth');

async function createReport(req, res) {
  const { longitude, latitude, city, problemTypeId, photos = [] } = req.body;

  if (!db) {
    return res.status(500).json({
      error: 'Firebase Firestore non initialisé',
      details: 'Vérifiez votre configuration Firebase'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const firebaseData = {
      reported_at: admin.firestore.FieldValue.serverTimestamp(),
      longitude: Number(longitude),
      latitude: Number(latitude),
      city: city,
      is_synced: false,
      report_status_id: 1,
      problem_type_id: problemTypeId || 1,
      user_id: req.user.uid,
      photos: photos // Ajouter les photos
    };

    const docRef = await db.collection('reports').add(firebaseData);

    // Insérer le rapport localement (si nécessaire)
    const localReport = await client.query(
      `INSERT INTO reports (firebase_id, longitude, latitude, city, report_status_id, problem_type_id, user_id, is_synced)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)
       RETURNING id`,
      [docRef.id, longitude, latitude, city, 1, problemTypeId || 1, req.user.uid]
    );

    const reportId = localReport.rows[0].id;

    // Ajouter les photos localement
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        await reportPhotosModel.addPhoto(reportId, photo, 'image/jpeg');
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      firebaseId: docRef.id,
      reportId: reportId,
      message: 'Signalement créé avec succès',
      photosCount: photos.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur création report:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}

async function getAllReports(req, res) {
  try {
    const { filter } = req.query;

    let query = `
      SELECT 
        r.id, r.reported_at, r.longitude, r.latitude, r.city, 
        r.is_synced, r.report_status_id, r.problem_type_id, r.firebase_id,
        rs.id as sync_id, rs.surface, rs.budget, rs.progress, rs.sent_to_firebase,
        c.name as company_name,
        rstat.name as status_name, 
        pt.name as problem_type_name,
        u.username,
        COUNT(rp.id) as photos_count,
        COALESCE(SUM(CASE WHEN rp.sent_to_firebase = true THEN 1 ELSE 0 END), 0) as synced_photos_count
      FROM reports r
      LEFT JOIN report_syncs rs ON r.id = rs.report_id
      LEFT JOIN companies c ON rs.company_id = c.id
      LEFT JOIN report_statuses rstat ON r.report_status_id = rstat.id
      LEFT JOIN problem_types pt ON r.problem_type_id = pt.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN report_photos rp ON r.id = rp.report_id
    `;

    if (filter === 'sent') {
      query += ` WHERE rs.sent_to_firebase = true`;
    } else if (filter === 'not_sent') {
      query += ` WHERE rs.sent_to_firebase = false OR rs.sent_to_firebase IS NULL`;
    }

    query += ` GROUP BY r.id, rs.id, c.id, rstat.id, pt.id, u.id ORDER BY r.reported_at DESC`;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur getAllReports:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getReportById(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        r.*, 
        rs.id as sync_id, rs.surface, rs.budget, rs.progress, 
        rs.sent_to_firebase, rs.company_id,
        c.name as company_name,
        rstat.name as status_name,
        pt.name as problem_type_name,
        u.username,
        COUNT(rp.id) as photos_count
      FROM reports r
      LEFT JOIN report_syncs rs ON r.id = rs.report_id
      LEFT JOIN companies c ON rs.company_id = c.id
      LEFT JOIN report_statuses rstat ON r.report_status_id = rstat.id
      LEFT JOIN problem_types pt ON r.problem_type_id = pt.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN report_photos rp ON r.id = rp.report_id
      WHERE r.id = $1
      GROUP BY r.id, rs.id, c.id, rstat.id, pt.id, u.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report non trouvé' });
    }

    const report = result.rows[0];

    // Récupérer les photos du rapport
    report.photos = await reportPhotosModel.getReportPhotos(id);

    res.json(report);
  } catch (error) {
    console.error('Erreur getReportById:', error);
    res.status(500).json({ error: error.message });
  }
}

async function addPhotosToReport(req, res) {
  try {
    const { id } = req.params;
    const { photos } = req.body; // Array de base64 strings

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ error: 'Aucune photo fournie' });
    }

    // Vérifier que le rapport existe
    const reportExists = await pool.query(
      'SELECT id FROM reports WHERE id = $1',
      [id]
    );

    if (reportExists.rows.length === 0) {
      return res.status(404).json({ error: 'Report non trouvé' });
    }

    const addedPhotos = [];
    for (const photoBase64 of photos) {
      const photo = await reportPhotosModel.addPhoto(id, photoBase64, 'image/jpeg');
      addedPhotos.push(photo);
    }

    res.status(201).json({
      message: `${addedPhotos.length} photo(s) ajoutée(s)`,
      photos: addedPhotos
    });
  } catch (error) {
    console.error('Erreur addPhotosToReport:', error);
    res.status(500).json({ error: error.message });
  }
}

const useFirebaseReportPhotos = (firebaseReportId) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!firebaseReportId) return;

    const fetchPhotos = async () => {
      setLoading(true);
      try {
        let photosData = [];
        
        // Essayer d'abord dans reports_traites_photos (rapports traités)
        const treatedPhotosRef = collection(db, 'reports_traites_photos');
        const treatedPhotosQuery = query(treatedPhotosRef, where('report_id', '==', firebaseReportId));
        const treatedPhotosSnapshot = await getDocs(treatedPhotosQuery);
        
        if (!treatedPhotosSnapshot.empty) {
          // Photos dans reports_traites_photos
          photosData = treatedPhotosSnapshot.docs.map(doc => ({
            id: doc.id,
            firebase_id: doc.id,
            photo_base64: doc.data().photo_base64,
            mime_type: doc.data().mime_type || 'image/jpeg',
            uploaded_at: doc.data().uploaded_at?.toDate() || new Date(),
            source: 'treated'
          }));
        } else {
          // Essayer dans les photos originales (reports collection)
          const originalReportRef = doc(db, 'reports', firebaseReportId);
          const originalReportDoc = await getDoc(originalReportRef);
          
          if (originalReportDoc.exists()) {
            const reportData = originalReportDoc.data();
            if (reportData.photos && Array.isArray(reportData.photos)) {
              photosData = reportData.photos.map((photoBase64, index) => ({
                id: `${firebaseReportId}_photo_${index}`,
                firebase_id: `${firebaseReportId}_photo_${index}`,
                photo_base64: photoBase64,
                mime_type: 'image/jpeg',
                uploaded_at: reportData.reported_at?.toDate() || new Date(),
                source: 'original'
              }));
            }
          }
        }

        // Formater les photos pour l'affichage
        const formattedPhotos = photosData.map(photo => ({
          ...photo,
          full_base64: photo.photo_base64.startsWith('data:')
            ? photo.photo_base64
            : `data:${photo.mime_type};base64,${photo.photo_base64}`
        }));

        setPhotos(formattedPhotos);
      } catch (err) {
        setError(err.message);
        console.error('Erreur chargement photos Firebase:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [firebaseReportId]);

  return { photos, loading, error };
};

const getReportPhotos = async (req, res) => {
  const { reportId } = req.params;

  try {
    const client = await pool.connect();

    // Récupérer les photos du rapport
    const result = await client.query(
      `SELECT 
        id,
        report_id,
        photo_base64,
        mime_type,
        uploaded_at,
        sent_to_firebase,
        firebase_photo_id
       FROM report_photos 
       WHERE report_id = $1 
       ORDER BY uploaded_at ASC`,
      [reportId]
    );

    client.release();

    // Formater les données pour le frontend
    const photos = result.rows.map(photo => ({
      id: photo.id,
      report_id: photo.report_id,
      photo_base64: photo.photo_base64,
      // Si photo_base64 ne contient pas le prefix data:, l'ajouter
      full_base64: photo.photo_base64.startsWith('data:')
        ? photo.photo_base64
        : `data:${photo.mime_type};base64,${photo.photo_base64}`,
      mime_type: photo.mime_type,
      uploaded_at: photo.uploaded_at,
      sent_to_firebase: photo.sent_to_firebase,
      firebase_photo_id: photo.firebase_photo_id
    }));

    res.json({
      success: true,
      data: {
        photos,
        count: photos.length
      }
    });

  } catch (error) {
    console.error('Erreur récupération photos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

async function deleteReportPhoto(req, res) {
  try {
    const { reportId, photoId } = req.params;

    const photo = await reportPhotosModel.deletePhoto(photoId);

    if (!photo) {
      return res.status(404).json({ error: 'Photo non trouvée' });
    }

    res.json({ message: 'Photo supprimée avec succès' });
  } catch (error) {
    console.error('Erreur deleteReportPhoto:', error);
    res.status(500).json({ error: error.message });
  }
}

async function updateReport(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { surface, budget, companyId, reportStatusId, progress } = req.body;

    await client.query('BEGIN');

    const syncCheck = await client.query(
      'SELECT id FROM report_syncs WHERE report_id = $1',
      [id]
    );

    if (syncCheck.rows.length > 0) {
      await client.query(
        `UPDATE report_syncs 
         SET surface = $1, budget = $2, progress = $3, 
             report_status_id = $4, company_id = $5, sent_to_firebase = false
         WHERE report_id = $6`,
        [surface, budget || 0, progress || 0, reportStatusId || 1, companyId, id]
      );
    } else {
      await client.query(
        `INSERT INTO report_syncs 
         (surface, budget, progress, report_status_id, company_id, report_id, sent_to_firebase)
         VALUES ($1, $2, $3, $4, $5, $6, false)`,
        [surface, budget || 0, progress || 0, reportStatusId || 1, companyId, id]
      );
    }

    await client.query(
      'UPDATE reports SET report_status_id = $1 WHERE id = $2',
      [reportStatusId || 1, id]
    );

    await client.query('COMMIT');

    const photosCount = await reportPhotosModel.countReportPhotos(id);

    res.json({
      message: 'Report mis à jour avec succès',
      photosCount: photosCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur updateReport:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}
async function uploadReport(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    //  Améliorez la requête pour inclure le compte des photos
    const result = await client.query(
      `SELECT 
        r.id, r.firebase_id, r.longitude, r.latitude, r.city,
        r.report_status_id, r.problem_type_id, r.photos_synced,
        rs.surface, rs.budget, rs.progress, rs.company_id,
        c.name as company_name,
        (SELECT COUNT(*) FROM report_photos rp WHERE rp.report_id = r.id AND rp.sent_to_firebase = false) as unsynced_photos_count
      FROM reports r
      INNER JOIN report_syncs rs ON r.id = rs.report_id
      LEFT JOIN companies c ON rs.company_id = c.id
      WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report non trouvé' });
    }

    const report = result.rows[0];

    // Synchroniser vers Firebase
    await syncUpload(report, client);
    await client.query('COMMIT');

    res.json({
      message: 'Report envoyé vers Firebase avec succès',
      photosCount: report.unsynced_photos_count || 0
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur uploadReport:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}

async function uploadAllReports(req, res) {
  const client = await pool.connect();
  let uploadCount = 0;
  let totalPhotos = 0;

  try {
    await client.query('BEGIN');

    const result = await pool.query(
      `SELECT 
        r.id, r.firebase_id, r.longitude, r.latitude, r.city,
        r.report_status_id, r.problem_type_id,
        rs.surface, rs.budget, rs.progress, rs.company_id,
        c.name as company_name
      FROM reports r
      INNER JOIN report_syncs rs ON r.id = rs.report_id
      LEFT JOIN companies c ON rs.company_id = c.id
      WHERE rs.sent_to_firebase = false OR rs.sent_to_firebase IS NULL`
    );

    for (const row of result.rows) {
      const photos = await reportPhotosModel.getUnsyncedPhotos(row.id);
      totalPhotos += photos.length;
      await syncUpload(row, client, photos);
      uploadCount++;
    }

    await client.query('COMMIT');

    res.json({
      message: `${uploadCount} signalements traités envoyés vers Firebase`,
      count: uploadCount,
      photosCount: totalPhotos
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur uploadAllReports:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}

async function syncDownloadReports(req, res) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const syncResult = await syncDownload(client);

    await client.query('COMMIT');

    res.json({
      message: `${syncResult.count} signalements téléchargés depuis Firebase`,
      count: syncResult.count,
      photosCount: syncResult.photosCount || 0
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur syncDownload:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}

async function getReportSyncs(req, res) {
  try {
    const syncs = await reportSyncModel.getAllReportSyncs();
    res.json(syncs);
  } catch (err) {
    console.error('Erreur getReportSyncs:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
}

async function updateReportSyncStatus(req, res) {
  const { id } = req.params;
  const { report_status_id, progress } = req.body;

  try {
    const updatedSync = await reportSyncModel.updateReportSyncStatus(id, report_status_id, progress);

    if (!updatedSync) {
      return res.status(404).json({ error: 'Report sync non trouvé' });
    }

    res.json({
      success: true,
      data: updatedSync,
      message: 'Statut mis à jour'
    });
  } catch (err) {
    console.error('Erreur updateReportSyncStatus:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
}

// Dans reportController.js
const getSyncStatus = async (req, res) => {
  try {
    const client = await pool.connect();

    const result = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM reports WHERE is_synced = false) as pending_sync,
        (SELECT COUNT(*) FROM reports WHERE photos_synced = false) as pending_photos,
        (SELECT COUNT(*) FROM report_photos WHERE sent_to_firebase = false) as pending_photo_uploads
    `);

    client.release();

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur récupération statut sync:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createReport,
  getAllReports,
  getReportById,
  addPhotosToReport,
  getReportPhotos,
  deleteReportPhoto,
  updateReport,
  uploadReport,
  uploadAllReports,
  syncDownload: syncDownloadReports,
  getReportSyncs,
  updateReportSyncStatus,
  getSyncStatus,
  useFirebaseReportPhotos,
};