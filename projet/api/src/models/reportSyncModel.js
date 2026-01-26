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

const updateReportSyncStatus = async (id, statusId, progress) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (statusId !== undefined && statusId !== null) {
      fields.push(`report_status_id = $${paramIndex++}`);
      params.push(statusId);
    }

    if (progress !== undefined && progress !== null) {
      fields.push(`progress = $${paramIndex++}`);
      params.push(progress);
    }

    if (fields.length === 0) {
       await client.query('ROLLBACK');
       return null; 
    }

    params.push(id);
    const idParamIndex = paramIndex;

    const updateQuery = `UPDATE report_syncs SET ${fields.join(', ')} WHERE id = $${idParamIndex} RETURNING *`;
    
    const result = await client.query(updateQuery, params);
    
    if (result.rows.length > 0) {
      // Only insert history if status changed (statusId provided)
      if (statusId !== undefined && statusId !== null) {
        await client.query(`
          INSERT INTO report_sync_histories (changed_at, report_status_id, report_sync_id)
          VALUES (NOW(), $1, $2)
        `, [statusId, id]);
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

module.exports = {
  getAllReportSyncs,
  getReportSyncFullData,
  updateReportSyncStatus
};
