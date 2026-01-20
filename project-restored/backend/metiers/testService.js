async function initDb(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS test(
      id SERIAL PRIMARY KEY,
      description VARCHAR(255)
    )
  `);
}

async function getTests(pool) {
  const result = await pool.query('SELECT * FROM test');
  return result.rows;
}

async function createTest(pool, description) {
  const result = await pool.query(
    'INSERT INTO test(description) VALUES($1) RETURNING *',
    [description]
  );
  return result.rows[0];
}

module.exports = {
  initDb,
  getTests,
  createTest
};

