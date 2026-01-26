const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/apiRoutes');
require('./config/db'); // Initialize DB connection test

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

// Routes
app.use('/api', apiRoutes);

// Route de test
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

// Gestion des erreurs 404
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
