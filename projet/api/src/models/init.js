const pool = require('../config/database');

async function initDatabase() {
  const client = await pool.connect();
  try {
    // Vérifier la connexion
    await client.query('SELECT NOW()');
    console.log('✓ Connexion PostgreSQL établie');
    
    // Les tables sont créées via init.sql au démarrage de Docker
    // Vérifier qu'elles existent
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('session_settings', 'user_auth_tracking', 'user_sessions')
    `);
    
    if (result.rows.length === 3) {
      console.log('✓ Toutes les tables sont présentes');
    } else {
      console.warn('⚠ Certaines tables sont manquantes');
    }
  } finally {
    client.release();
  }
}

module.exports = { initDatabase };