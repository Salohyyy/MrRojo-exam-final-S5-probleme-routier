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
    const { surface, budget, companyId, reportStatusId, progress, repairTypeLevel } = req.body;

    await client.query('BEGIN');

    const syncCheck = await client.query(
      'SELECT id FROM report_syncs WHERE report_id = $1',
      [id]
    );

    if (syncCheck.rows.length > 0) {
      await client.query(
        `UPDATE report_syncs 
         SET surface = $1, budget = $2, progress = $3, 
             report_status_id = $4, company_id = $5, repair_type_level = $6, sent_to_firebase = false
         WHERE report_id = $7`,
        [surface, budget || 0, progress || 0, reportStatusId || 1, companyId, repairTypeLevel || null, id]
      );
    } else {
      await client.query(
        `INSERT INTO report_syncs 
         (surface, budget, progress, report_status_id, company_id, repair_type_level, report_id, sent_to_firebase)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
        [surface, budget || 0, progress || 0, reportStatusId || 1, companyId, repairTypeLevel || null, id]
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

/**
 * Upload ALL reports vers Firebase (version batch)
 * Maintenant syncUpload gère automatiquement création ou mise à jour
 */
async function uploadAllReports(req, res) {
  const client = await pool.connect();
  let uploadCount = 0;
  let totalPhotos = 0;

  try {
    await client.query('BEGIN');

    // Récupérer tous les report_syncs non synchronisés
    const result = await client.query(
      `SELECT 
        r.id, r.firebase_id, r.longitude, r.latitude, r.city,
        r.report_status_id, r.problem_type_id,
        rs.id as sync_id, rs.surface, rs.budget, rs.progress, rs.company_id,
        c.name as company_name,
        pt.name as problem_type_name,
        rst.name as status_name
      FROM report_syncs rs
      INNER JOIN reports r ON rs.report_id = r.id
      LEFT JOIN companies c ON rs.company_id = c.id
      LEFT JOIN problem_types pt ON r.problem_type_id = pt.id
      LEFT JOIN report_statuses rst ON rs.report_status_id = rst.id
      WHERE rs.sent_to_firebase = false`
    );

    console.log(`📦 ${result.rows.length} rapports à synchroniser vers Firebase`);

    for (const row of result.rows) {
      try {
        // Compter les photos
        const photosResult = await client.query(
          'SELECT COUNT(*) as count FROM report_photos WHERE report_id = $1',
          [row.id]
        );
        totalPhotos += parseInt(photosResult.rows[0].count) || 0;
        
        // Synchroniser (syncUpload gère automatiquement création ou mise à jour)
        await syncUpload(row, client);
        uploadCount++;
        
      } catch (rowError) {
        console.error(`❌ Erreur sur le rapport ${row.id}:`, rowError);
        // Continuer avec les autres rapports
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Synchronisation batch terminée',
      stats: {
        uploaded: uploadCount,
        total_processed: uploadCount,
        photos_synced: totalPhotos
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur uploadAllReports:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  } finally {
    client.release();
  }
}

/**
 * Récupérer les photos d'un rapport pour Firebase
 * @param {number} reportId - ID du rapport dans PostgreSQL
 * @param {object} client - Client PostgreSQL pour la transaction
 * @returns {Promise<Array>} Tableau de photos au format Firebase
 */
async function getReportPhotosForFirebase(reportId, client) {
    try {
        const photosResult = await client.query(
            `SELECT 
                id, 
                photo_base64,
                mime_type,
                uploaded_at
             FROM report_photos 
             WHERE report_id = $1 AND sent_to_firebase = false
             ORDER BY uploaded_at ASC`,
            [reportId]
        );

        console.log(`📸 ${photosResult.rows.length} photos à inclure dans le rapport traité`);

        // Formater les photos comme dans Firebase (même format que les reports originaux)
        const photos = photosResult.rows.map(photo => {
            let photoBase64 = photo.photo_base64;
            
            // Nettoyer le base64 si nécessaire (enlever "data:image/jpeg;base64,")
            if (typeof photoBase64 === 'string' && photoBase64.includes('base64,')) {
                photoBase64 = photoBase64.split('base64,')[1];
            }
            
            // Retourner le base64 pur (sans prefix)
            return photoBase64;
        }).filter(photo => photo && typeof photo === 'string'); // Filtrer les valeurs nulles

        return photos;
        
    } catch (error) {
        console.error('Erreur récupération photos pour Firebase:', error);
        return []; // Retourner un tableau vide en cas d'erreur
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

async function getReportSyncHistories(req, res) {
  const { id } = req.params;
  try {
    const histories = await reportSyncModel.getReportSyncHistories(id);
    res.json(histories);
  } catch (err) {
    console.error('Erreur getReportSyncHistories:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
}

async function getAllReportSyncHistories(req, res) {
  try {
    const histories = await reportSyncModel.getAllReportSyncHistories();
    res.json(histories);
  } catch (err) {
    console.error('Erreur getAllReportSyncHistories:', err);
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

/**
 * Upload un seul report_sync vers Firebase par son ID (version améliorée)
 */
async function uploadReportSync(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params; // report_sync.id

    await client.query('BEGIN');

    // Récupérer le report_sync avec plus d'informations
    const result = await client.query(
      `SELECT 
        r.id, r.firebase_id, r.longitude, r.latitude, r.city,
        r.report_status_id, r.problem_type_id, r.photos_synced,
        rs.id as sync_id, rs.surface, rs.budget, rs.progress, rs.company_id, 
        rs.sent_to_firebase, rs.photos_synced as sync_photos_synced,
        c.name as company_name,
        pt.name as problem_type_name,
        rst.name as status_name,
        (SELECT COUNT(*) FROM report_photos rp WHERE rp.report_id = r.id AND rp.sent_to_firebase = false) as unsynced_photos_count
      FROM report_syncs rs
      INNER JOIN reports r ON rs.report_id = r.id
      LEFT JOIN companies c ON rs.company_id = c.id
      LEFT JOIN problem_types pt ON r.problem_type_id = pt.id
      LEFT JOIN report_statuses rst ON rs.report_status_id = rst.id
      WHERE rs.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Report sync non trouvé' });
    }

    const row = result.rows[0];
    
    // Synchroniser vers Firebase (création ou mise à jour)
    await syncUpload(row, client);
    
    await client.query('COMMIT');

    // Récupérer le compte final des photos
    const photosCountResult = await client.query(
      'SELECT COUNT(*) as count FROM report_photos WHERE report_id = $1 AND sent_to_firebase = true',
      [row.id]
    );

    res.json({ 
      success: true,
      message: 'Signalement synchronisé vers Firebase avec succès',
      sync_id: id,
      report_id: row.id,
      photos_synced: parseInt(photosCountResult.rows[0].count) || 0,
      already_exists: false
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur uploadReportSync:', error);
    
    // Vérifier si l'erreur est due à un doublon
    if (error.message && error.message.includes('already exists') || error.message.includes('exists')) {
      return res.status(409).json({ 
        success: false,
        error: 'Ce rapport existe déjà dans Firebase',
        message: 'Aucune action nécessaire'
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  } finally {
    client.release();
  }
}

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
  uploadReportSync,
  syncDownload: syncDownloadReports,
  getReportSyncs,
  getReportSyncHistories,
  getAllReportSyncHistories,
  updateReportSyncStatus, 
  getSyncStatus,
  useFirebaseReportPhotos,
};