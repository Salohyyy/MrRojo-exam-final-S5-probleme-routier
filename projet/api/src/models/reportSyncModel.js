const pool = require('../config/database');

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

const updateReportSyncStatus = async (id, statusId, changedAt) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (!statusId) {
      await client.query('ROLLBACK');
      return null;
    }

    const progress = STATUS_PROGRESS_MAP[parseInt(statusId)] ?? 0;
    const dateToUse = changedAt || new Date().toISOString();

    const updateQuery = `UPDATE report_syncs SET report_status_id = $1, progress = $2 WHERE id = $3 RETURNING *`;
    const result = await client.query(updateQuery, [statusId, progress, id]);

    if (result.rows.length > 0) {
      await client.query(`
        INSERT INTO report_sync_histories (changed_at, report_status_id, report_sync_id)
        VALUES ($1, $2, $3)
      `, [dateToUse, statusId, id]);
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
