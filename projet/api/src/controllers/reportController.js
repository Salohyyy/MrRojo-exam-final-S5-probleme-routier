
const pool = require('../config/database');
const { db } = require('../config/firebase');
const admin = require('firebase-admin');
const { syncUserToPostgres, syncDownload, syncUpload } = require('../utils/syncHelper');

async function createReport(req, res) {
  const { longitude, latitude, city, problemTypeId } = req.body;

  // DEBUG
  console.log('db:', db);
  console.log('db type:', typeof db);
  console.log('admin:', admin);

  if (!db) {
    return res.status(500).json({
      error: 'Firebase Firestore non initialisé',
      details: 'Vérifiez votre configuration Firebase'
    });
  }

  try {
    const firebaseData = {
      reported_at: admin.firestore.FieldValue.serverTimestamp(),
      longitude: Number(longitude),
      latitude: Number(latitude),
      city: city,
      is_synced: false,
      report_status_id: 1,
      problem_type_id: problemTypeId || 1,
      user_id: req.user.uid
    };

    const docRef = await db.collection('reports').add(firebaseData);

    res.status(201).json({
      firebaseId: docRef.id,
      message: 'Signalement créé dans Firebase'
    });
  } catch (error) {
    console.error('Erreur création report:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getAllReports(req, res) {

  console.log("get all");

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
        u.username
      FROM reports r
      LEFT JOIN report_syncs rs ON r.id = rs.report_id
      LEFT JOIN companies c ON rs.company_id = c.id
      LEFT JOIN report_statuses rstat ON r.report_status_id = rstat.id
      LEFT JOIN problem_types pt ON r.problem_type_id = pt.id
      LEFT JOIN users u ON r.user_id = u.id
    `;

    if (filter === 'sent') {
      query += ` WHERE rs.sent_to_firebase = true`;
    } else if (filter === 'not_sent') {
      query += ` WHERE rs.sent_to_firebase = false OR rs.sent_to_firebase IS NULL`;
    }

    query += ` ORDER BY r.reported_at DESC`;
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
        u.username
      FROM reports r
      LEFT JOIN report_syncs rs ON r.id = rs.report_id
      LEFT JOIN companies c ON rs.company_id = c.id
      LEFT JOIN report_statuses rstat ON r.report_status_id = rstat.id
      LEFT JOIN problem_types pt ON r.problem_type_id = pt.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur getReportById:', error);
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
    res.json({ message: 'Report mis à jour avec succès' });
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

    const result = await pool.query(
      `SELECT 
        r.id, r.firebase_id, r.longitude, r.latitude, r.city,
        r.report_status_id, r.problem_type_id,
        rs.surface, rs.budget, rs.progress, rs.company_id,
        c.name as company_name
      FROM reports r
      INNER JOIN report_syncs rs ON r.id = rs.report_id
      LEFT JOIN companies c ON rs.company_id = c.id
      WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report non trouvé' });
    }

    await syncUpload(result.rows[0], client);
    await client.query('COMMIT');

    res.json({ message: 'Report envoyé vers Firebase avec succès' });
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
      await syncUpload(row, client);
      uploadCount++;
    }

    await client.query('COMMIT');

    res.json({
      message: `${uploadCount} signalements traités envoyés vers Firebase`,
      count: uploadCount
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
    
    const syncCount = await syncDownload(client);
    
    await client.query('COMMIT');
    
    res.json({
      message: `${syncCount} signalements téléchargés depuis Firebase`,
      count: syncCount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur syncDownload:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}


module.exports = {
  createReport,
  getAllReports,
  getReportById,
  updateReport,
  uploadReport,
  uploadAllReports,
  syncDownload: syncDownloadReports
};