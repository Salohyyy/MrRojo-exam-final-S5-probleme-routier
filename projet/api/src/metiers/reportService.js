async function getReports(pool) {
  const query = `
    SELECT
      r.id,
      r.reported_at,
      r.longitude,
      r.latitude,
      r.city,
      r.is_synced,
      rs.name AS report_status,
      pt.name AS problem_type,
      u.username AS reporter,
      s.id AS sync_id,
      s.surface,
      s.budget,
      s.progress,
      c.name AS company_name
    FROM reports r
    LEFT JOIN report_statuses rs ON r.report_status_id = rs.id
    LEFT JOIN problem_types pt ON r.problem_type_id = pt.id
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN report_syncs s ON s.report_id = r.id
    LEFT JOIN companies c ON s.company_id = c.id
  `;

  const result = await pool.query(query);
  return result.rows;
}

module.exports = {
  getReports
};
