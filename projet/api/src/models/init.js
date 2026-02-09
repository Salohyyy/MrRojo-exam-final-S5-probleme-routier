const pool = require('../config/database');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function initDatabase(retries = 10, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
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
        return; // Succès
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(`Tentative de connexion ${i + 1}/${retries} échouée:`, err.message);
      if (i === retries - 1) throw err;
      console.log(`Nouvelle tentative dans ${delay/1000} secondes...`);
      await wait(delay);
    }
  }
}

module.exports = { initDatabase };