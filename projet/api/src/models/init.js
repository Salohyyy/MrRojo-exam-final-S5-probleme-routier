const pool = require('../config/database');

// Utility function to wait
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function initDatabase(maxRetries = 10, retryDelay = 3000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Tentative de connexion PostgreSQL (${attempt}/${maxRetries})...`);
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
        
        return; // Success, exit function
      } finally {
        client.release();
      }
    } catch (error) {
      lastError = error;
      console.error(`✗ Échec connexion (tentative ${attempt}/${maxRetries}): ${error.message}`);
      
      if (attempt < maxRetries) {
        console.log(`Nouvelle tentative dans ${retryDelay/1000}s...`);
        await sleep(retryDelay);
      }
    }
  }
  
  // If we reach here, all retries failed
  throw new Error(`Impossible de se connecter à PostgreSQL après ${maxRetries} tentatives: ${lastError.message}`);
}

module.exports = { initDatabase };