const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'signalapp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'steve',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Erreur PostgreSQL inattendue:', err);
});

module.exports = pool;