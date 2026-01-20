const { pool } = require('../config/db.config');
const { db } = require('../config/firebase.config');
const { getReports } = require('../metiers/reportService');

// GET /api/report-syncs
// Liste les travaux en cours avec détails
const getReportSyncs = async (req, res) => {
  try {
    const query = `
      SELECT
        s.id AS sync_id,
        r.id AS report_id,
        r.city,
        r.latitude,
        r.longitude,
        rs.name AS status,
        s.budget,
        s.progress,
        s.surface,
        c.name AS company_name
      FROM report_syncs s
      JOIN reports r ON s.report_id = r.id
      LEFT JOIN report_statuses rs ON r.report_status_id = rs.id
      LEFT JOIN companies c ON s.company_id = c.id
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching report syncs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/report-statuses
// Liste les statuts possibles
const getReportStatuses = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM report_statuses ORDER BY id');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/report-syncs/:id/status
// Met à jour le statut dans PostgreSQL ET synchronise avec Firebase
const updateReportSyncStatus = async (req, res) => {
  const { id } = req.params; // report_syncs id
  const { status_id, progress } = req.body; // status_id for reports, progress for report_syncs

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get the report_id from report_syncs
    const syncRes = await client.query('SELECT report_id FROM report_syncs WHERE id = $1', [id]);
    if (syncRes.rows.length === 0) {
      throw new Error('Chantier non trouvé');
    }
    const reportId = syncRes.rows[0].report_id;

    // 2. Update reports status
    if (status_id) {
      await client.query('UPDATE reports SET report_status_id = $1, updated_at = NOW() WHERE id = $2', [status_id, reportId]);
    }

    // 3. Update report_syncs progress if provided
    if (progress !== undefined) {
      await client.query('UPDATE report_syncs SET progress = $1, updated_at = NOW() WHERE id = $2', [progress, id]);
    }

    await client.query('COMMIT');

    // 4. Fetch updated data for Firebase
    const query = `
      SELECT
        r.id,
        r.city,
        r.latitude,
        r.longitude,
        rs.name AS status,
        s.budget,
        s.progress,
        s.surface,
        c.name AS company_name
      FROM reports r
      JOIN report_syncs s ON s.report_id = r.id
      LEFT JOIN report_statuses rs ON r.report_status_id = rs.id
      LEFT JOIN companies c ON s.company_id = c.id
      WHERE s.id = $1
    `;
    const updatedData = await pool.query(query, [id]);
    const data = updatedData.rows[0];

    // 5. Sync to Firebase (collection report_traites)
    if (data) {
      await db.collection('reports_traites').doc(data.id.toString()).set({
        ...data,
        updated_at: new Date().toISOString()
      }, { merge: true });
    }

    res.json({ success: true, message: 'Mise à jour effectuée et synchronisée', data });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

// POST /api/sync-all-to-firebase
// Déclenche une synchronisation complète PG -> Firebase
const syncAllToFirebase = async (req, res) => {
  try {
    // 1. Get all reports with details
    const reports = await getReports(pool);
    console.log(`Found ${reports.length} reports to sync.`);

    if (reports.length === 0) {
      return res.json({ success: true, message: 'Aucun signalement à synchroniser.' });
    }

    const batch = db.batch();
    let count = 0;

    reports.forEach(report => {
        // Add to 'reports' collection (raw data)
        const reportRef = db.collection('reports').doc(report.id.toString());
        batch.set(reportRef, {
            id: report.id,
            city: report.city || 'Inconnu',
            latitude: report.latitude,
            longitude: report.longitude,
            reported_at: report.reported_at,
            reporter: report.reporter || 'Anonyme',
            problem_type: report.problem_type || 'Autre',
            status: report.report_status || 'En attente'
        }, { merge: true });

        // If it has company info, add to 'reports_traites'
        if (report.company_name) { 
            const traiteRef = db.collection('reports_traites').doc(report.id.toString());
            batch.set(traiteRef, {
                id: report.id,
                city: report.city,
                latitude: report.latitude,
                longitude: report.longitude,
                company_name: report.company_name,
                budget: report.budget,
                progress: report.progress,
                surface: report.surface,
                status: report.report_status,
                updated_at: new Date().toISOString()
            }, { merge: true });
        }
        count++;
    });

    await batch.commit();
    res.json({ success: true, message: `Synchronisation complète terminée (${count} éléments traités).` });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getReportSyncs,
  getReportStatuses,
  updateReportSyncStatus,
  syncAllToFirebase
};
