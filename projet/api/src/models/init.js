const pool = require('../config/database');

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    console.log('✓ Connexion PostgreSQL établie');
    
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'employees'
    `);
    
    if (result.rows.length > 0) {
      console.log('✓ Tables présentes');
    } else {
      console.warn('⚠ Tables manquantes');
    }
  } finally {
    client.release();
  }
}

module.exports = { initDatabase };