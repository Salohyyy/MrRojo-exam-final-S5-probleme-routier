const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { 
  syncReportToFirebase, 
  syncReportSyncToFirebase
} = require('./sync');

const app = express();

// ✅ CONFIGURATION CORS COMPLÈTE
app.use(cors({
  origin: '*', // Accepter toutes les origines en développement
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

// ✅ Middleware pour ajouter les headers CORS manuellement (sécurité supplémentaire)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  
  // Répondre immédiatement aux requêtes OPTIONS
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: 5432,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'routes_db'
});

// Test de connexion
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erreur connexion PostgreSQL:', err.stack);
  } else {
    console.log('✅ Connecté à PostgreSQL');
    release();
  }
});

// ==================== ROUTE DE TEST ====================
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API Problèmes Routiers',
    status: 'OK',
    endpoints: [
      'GET /api/reports',
      'GET /api/report-syncs',
      'GET /api/report-statuses',
      'PUT /api/report-syncs/:id/status',
      'POST /api/sync-all-to-firebase'
    ]
  });
});

// ==================== REPORTS ====================
app.get('/api/reports', async (req, res) => {
  try {
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
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Erreur /api/reports:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
});

// ==================== REPORT SYNCS ====================
app.get('/api/report-syncs', async (req, res) => {
  try {
    console.log('📡 Requête reçue pour /api/report-syncs');
    
    const result = await pool.query(`
      SELECT 
        rs.id,
        rs.surface,
        rs.budget,
        rs.progress,
        rs.report_status_id,
        rs.company_id,
        rs.report_id,
        rst.name as status_name,
        rst.level as status_level,
        c.name as company_name,
        c.address as company_address,
        r.longitude,
        r.latitude,
        r.city,
        r.reported_at,
        r.problem_type_id,
        pt.name as problem_name,
        u.username as reporter_name,
        u.id as user_id
      FROM report_syncs rs
      JOIN report_statuses rst ON rs.report_status_id = rst.id
      JOIN companies c ON rs.company_id = c.id
      JOIN reports r ON rs.report_id = r.id
      JOIN problem_types pt ON r.problem_type_id = pt.id
      JOIN users u ON r.user_id = u.id
      ORDER BY rs.id DESC
    `);
    
    console.log(`✅ ${result.rows.length} report_syncs trouvés`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Erreur /api/report-syncs:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
});

// ==================== REPORT STATUSES ====================
app.get('/api/report-statuses', async (req, res) => {
  try {
    console.log('📡 Requête reçue pour /api/report-statuses');
    
    const result = await pool.query('SELECT * FROM report_statuses ORDER BY level');
    
    console.log(`✅ ${result.rows.length} statuts trouvés`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Erreur /api/report-statuses:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
});

// ==================== UPDATE REPORT STATUS ====================
app.put('/api/reports/:id/status', async (req, res) => {
  const { id } = req.params;
  const { report_status_id } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await client.query(`
      UPDATE reports 
      SET report_status_id = $1
      WHERE id = $2
      RETURNING *
    `, [report_status_id, id]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Report non trouvé' });
    }
    
    await client.query('COMMIT');
    
    // Synchroniser vers Firebase
    await syncReportToFirebase(result.rows[0]);
    
    res.json({ 
      success: true, 
      data: result.rows[0],
      message: '✅ Statut mis à jour dans PostgreSQL et Firebase'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur mise à jour report:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  } finally {
    client.release();
  }
});

// ==================== UPDATE REPORT SYNC STATUS ====================
app.put('/api/report-syncs/:id/status', async (req, res) => {
  const { id } = req.params;
  const { report_status_id, progress } = req.body;
  
  console.log(`📡 Requête de mise à jour reçue pour report_sync #${id}`);
  console.log(`   Nouveau statut: ${report_status_id}`);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const updateQuery = progress !== undefined 
      ? `UPDATE report_syncs SET report_status_id = $1, progress = $2 WHERE id = $3 RETURNING *`
      : `UPDATE report_syncs SET report_status_id = $1 WHERE id = $2 RETURNING *`;
    
    const updateParams = progress !== undefined 
      ? [report_status_id, progress, id]
      : [report_status_id, id];
    
    const result = await client.query(updateQuery, updateParams);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Report sync non trouvé' });
    }
    
    // Créer un historique
    await client.query(`
      INSERT INTO report_sync_histories (changed_at, report_status_id, report_sync_id)
      VALUES (NOW(), $1, $2)
    `, [report_status_id, id]);
    
    // Récupérer les données complètes pour Firebase
    const fullData = await client.query(`
      SELECT 
        rs.*,
        c.name as company_name,
        r.city,
        r.latitude,
        r.longitude,
        r.problem_type_id
      FROM report_syncs rs
      JOIN companies c ON rs.company_id = c.id
      JOIN reports r ON rs.report_id = r.id
      WHERE rs.id = $1
    `, [id]);
    
    await client.query('COMMIT');
    
    console.log('✅ Mise à jour réussie dans PostgreSQL');
    
    // Synchroniser vers Firebase
    await syncReportSyncToFirebase(result.rows[0], fullData.rows[0]);
    
    console.log('✅ Synchronisation Firebase réussie');
    
    res.json({ 
      success: true, 
      data: result.rows[0],
      message: '✅ Statut mis à jour dans PostgreSQL et Firebase'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur mise à jour report_sync:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  } finally {
    client.release();
  }
});

// ==================== SYNC ALL TO FIREBASE ====================
app.post('/api/sync-all-to-firebase', async (req, res) => {
  try {
    let syncCount = 0;
    
    const reports = await pool.query('SELECT * FROM reports');
    for (const report of reports.rows) {
      await syncReportToFirebase(report);
      syncCount++;
    }
    
    const reportSyncs = await pool.query(`
      SELECT 
        rs.*,
        c.name as company_name,
        r.city,
        r.latitude,
        r.longitude,
        r.problem_type_id
      FROM report_syncs rs
      JOIN companies c ON rs.company_id = c.id
      JOIN reports r ON rs.report_id = r.id
    `);
    
    for (const sync of reportSyncs.rows) {
      await syncReportSyncToFirebase(sync, sync);
      syncCount++;
    }
    
    res.json({ 
      success: true, 
      message: `✅ ${syncCount} enregistrements synchronisés vers Firebase`
    });
  } catch (err) {
    console.error('❌ Erreur synchronisation:', err);
    res.status(500).json({ error: 'Erreur synchronisation', details: err.message });
  }
});

// ==================== GESTION DES ERREURS 404 ====================
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route non trouvée',
    path: req.path,
    method: req.method
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('🚀 Serveur API démarré avec succès !');
  console.log('═══════════════════════════════════════════════');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📊 PostgreSQL: routes_db@postgres:5432`);
  console.log(`🔥 Firebase: Actif`);
  console.log('═══════════════════════════════════════════════');
  console.log('');
});