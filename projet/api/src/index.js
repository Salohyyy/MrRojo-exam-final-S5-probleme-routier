const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { initDatabase } = require('./models/init');
const employeeAuthRoutes = require('./routes/employeeAuth');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/employee-auth', employeeAuthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialisation
async function startServer() {
  try {
    await initDatabase();
    console.log('✓ Base de données initialisée');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Serveur démarré sur le port ${PORT}`);
      console.log('');
      console.log('📍 Routes disponibles:');
      console.log('   - POST /api/employee-auth/login');
      console.log('   - POST /api/auth/check-attempts');
      console.log('   - POST /api/auth/failed-attempt');
      console.log('   - POST /api/auth/successful-login');
      console.log('   - GET  /api/admin/*');
      console.log('');
      console.log('🔐 Admin par défaut: admin / admin123');
    });
  } catch (error) {
    console.error('Erreur au démarrage:', error);
    process.exit(1);
  }
}

startServer();