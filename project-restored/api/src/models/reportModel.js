const pool = require('../config/db');

const getAllReports = async () => {
  const result = await pool.query(`
    SELECT 
      r.*,
      pt.name as problem_name,
      rs.name as status_name,
      rs.level as status_level,
      u.username
    FROM reports r
    LEFT JOIN problem_types pt ON r.problem_type_id = pt.id
    LEFT JOIN report_statuses rs ON r.report_status_id = rs.id
    LEFT JOIN users u ON r.user_id = u.id
    ORDER BY r.reported_at DESC
  `);
  return result.rows;
};

const updateReportStatus = async (id, statusId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      UPDATE reports 
      SET report_status_id = $1
      WHERE id = $2
      RETURNING *
    `, [statusId, id]);
    
    if (result.rows.length > 0) {
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

module.exports = { getAllReports, updateReportStatus };
