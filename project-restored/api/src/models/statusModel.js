const pool = require('../config/db');

const getAllStatuses = async () => {
  const result = await pool.query('SELECT * FROM report_statuses ORDER BY level');
  return result.rows;
};

module.exports = { getAllStatuses };
