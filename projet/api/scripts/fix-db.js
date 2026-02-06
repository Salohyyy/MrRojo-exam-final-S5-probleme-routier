const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'routes_db',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin',
});

async function migrate() {
  try {
    console.log('Adding sent_to_firebase column to report_syncs...');
    await pool.query('ALTER TABLE report_syncs ADD COLUMN IF NOT EXISTS sent_to_firebase BOOLEAN DEFAULT FALSE;');
    console.log('✅ Success: report_syncs updated.');

    console.log('Adding firebase_id column to reports...');
    await pool.query('ALTER TABLE reports ADD COLUMN IF NOT EXISTS firebase_id VARCHAR(255);');
    console.log('✅ Success: reports updated.');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await pool.end();
  }
}

migrate();
