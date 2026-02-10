const pool = require('../config/database');
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

const getAllReportSyncs = async () => {
  const result = await pool.query(`
    SELECT 
      rs.id,
      rs.surface,
      rs.budget,
      rs.progress,
      rs.report_status_id,
      rs.company_id,
      rs.report_id,
      rs.sent_to_firebase,
      rst.name as status_name,
      rst.level as status_level,
      c.name as company_name,
      c.address as company_address,
      r.longitude,
      r.latitude,
      r.city,
      r.reported_at,
      r.problem_type_id,
      pt.name as problem_name,
      u.username as reporter_name,
      u.id as user_id
    FROM report_syncs rs
    JOIN report_statuses rst ON rs.report_status_id = rst.id
    JOIN companies c ON rs.company_id = c.id
    JOIN reports r ON rs.report_id = r.id
    JOIN problem_types pt ON r.problem_type_id = pt.id
    JOIN users u ON r.user_id = u.id
    ORDER BY rs.id DESC
  `);
  return result.rows;
};

const getReportSyncFullData = async (id) => {
  const result = await pool.query(`
    SELECT 
      rs.*,
      c.name as company_name,
      r.city,
      r.latitude,
      r.longitude,
      r.problem_type_id
    FROM report_syncs rs
    JOIN companies c ON rs.company_id = c.id
    JOIN reports r ON rs.report_id = r.id
    WHERE rs.id = $1
  `, [id]);
  return result.rows[0];
};

// Mapping statut -> progression automatique
const STATUS_PROGRESS_MAP = {
  1: 0,    // Nouveau = 0%
  2: 50,   // En cours = 50%
  3: 100,  // Terminé = 100%
  4: 0     // Rejeté = 0%
};

// Mapping statut ID -> nom
const STATUS_NAME_MAP = {
  1: 'Nouveau',
  2: 'En cours',
  3: 'Terminé',
  4: 'Rejeté'
};

const updateReportSyncStatus = async (id, statusId, changedAt) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (!statusId) {
      await client.query('ROLLBACK');
      return null;
    }

    const progress = STATUS_PROGRESS_MAP[parseInt(statusId)] ?? 0;
    const statusName = STATUS_NAME_MAP[parseInt(statusId)] || 'Inconnu';
    const dateToUse = changedAt || new Date().toISOString();

    const updateQuery = `UPDATE report_syncs SET report_status_id = $1, progress = $2, sent_to_firebase = false WHERE id = $3 RETURNING *`;
    const result = await client.query(updateQuery, [statusId, progress, id]);

    if (result.rows.length > 0) {
      const reportSync = result.rows[0];
      
      // Historique local
      await client.query(`
        INSERT INTO report_sync_histories (changed_at, report_status_id, report_sync_id)
        VALUES ($1, $2, $3)
      `, [dateToUse, statusId, id]);
      
      // Récupérer le firebase_id depuis reports
      const reportResult = await client.query(
        'SELECT firebase_id FROM reports WHERE id = $1',
        [reportSync.report_id]
      );
      
      const firebaseId = reportResult.rows[0]?.firebase_id;
      
      // ✅ METTRE À JOUR Firebase (reports_traites et reports)
      if (firebaseId && db) {
        try {
          // 1. Mettre à jour reports_traites
          const querySnapshot = await db.collection('reports_traites')
            .where('original_firebase_id', '==', firebaseId)
            .limit(1)
            .get();
          
          if (!querySnapshot.empty) {
            const docId = querySnapshot.docs[0].id;
            await db.collection('reports_traites').doc(docId).update({
              report_status_id: parseInt(statusId),
              status_name: statusName,
              progress: progress,
              synced_at: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`📝 reports_traites/${docId} mis à jour: ${statusName} (${progress}%)`);
          }
          
          // 2. Mettre à jour la collection reports originale
          const originalReportRef = db.collection('reports').doc(firebaseId);
          const originalDoc = await originalReportRef.get();
          
          if (originalDoc.exists) {
            await originalReportRef.update({
              report_status_id: parseInt(statusId),
              status_name: statusName,
              is_treated: true,
              progress: progress,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`📝 reports/${firebaseId} mis à jour: ${statusName} (${progress}%)`);
          }
          
        } catch (firebaseError) {
          console.warn('⚠️ Erreur mise à jour Firebase:', firebaseError.message);
          // Ne pas bloquer la mise à jour locale
        }
      }
      
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }

    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getReportSyncHistories = async (reportSyncId) => {
  const result = await pool.query(`
    SELECT 
      rsh.id,
      rsh.changed_at,
      rsh.report_status_id,
      rst.name as status_name
    FROM report_sync_histories rsh
    JOIN report_statuses rst ON rsh.report_status_id = rst.id
    WHERE rsh.report_sync_id = $1
    ORDER BY rsh.changed_at ASC
  `, [reportSyncId]);
  return result.rows;
};

const getAllReportSyncHistories = async () => {
  const result = await pool.query(`
    SELECT 
      rsh.id,
      rsh.changed_at,
      rsh.report_status_id,
      rsh.report_sync_id,
      rst.name as status_name
    FROM report_sync_histories rsh
    JOIN report_statuses rst ON rsh.report_status_id = rst.id
    ORDER BY rsh.report_sync_id, rsh.changed_at ASC
  `);
  return result.rows;
};

module.exports = {
  getAllReportSyncs,
  getReportSyncFullData,
  updateReportSyncStatus,
  getReportSyncHistories,
  getAllReportSyncHistories
};
