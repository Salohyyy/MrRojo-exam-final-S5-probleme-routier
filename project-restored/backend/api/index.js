const express = require('express');
const cors = require('cors');
require('dotenv').config();

// On importe directement db depuis la config
const { db } = require('../config/firebase.config'); // Vérifie bien le chemin ici selon ta structure

const app = express();

app.use(cors());
app.use(express.json());

// Routes
const reportsRoutes = require('../routes/reports.routes');
const managerRoutes = require('../routes/manager.routes');

app.use('/api/reports', reportsRoutes);
app.use('/api', managerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Route de test Firebase simplifiée
app.get('/api/test-firebase', async (req, res) => {
  try {
    // On utilise le db déjà importé en haut du fichier
    const snapshot = await db.collection('report_traites').limit(1).get();
    res.json({ 
      success: true, 
      message: 'Firebase Firestore opérationnel',
      count: snapshot.size
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});