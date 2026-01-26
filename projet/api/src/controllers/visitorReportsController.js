const { db } = require('../config/firebase');
const { pool } = require('../config/database');
const { getReports } = require('../metiers/reportService');
const reportSyncModel = require('../models/reportSyncModel');

// GET /api/visitor/reports/syncs
const getReportSyncs = async (req, res) => {
  try {
    const reportSyncs = await reportSyncModel.getAllReportSyncs();
    res.json(reportSyncs);
  } catch (error) {
    console.error('Error fetching visitor report syncs:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/reports
// Récupère tous les signalements depuis Firebase (ancienne version)
const getAllReports = async (req, res) => {
  try {
    const reportsRef = db.collection('reports_traites');
    const snapshot = await reportsRef.get();

    if (snapshot.empty) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Aucun signalement trouvé'
      });
    }

    const reports = [];
    snapshot.forEach(doc => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✅ ${reports.length} signalements récupérés depuis Firebase (reports_traites)`);
    if (reports.length > 0) {
      console.log('🔍 Exemple de signalement (premier élément):', JSON.stringify(reports[0], null, 2));
    }

    res.status(200).json({
      success: true,
      data: reports,
      count: reports.length
    });
  } catch (error) {
    console.error('❌ Erreur getAllReports:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// GET /api/reports/postgres
// Récupère tous les signalements depuis PostgreSQL (avec jointures)
const getAllReportsFromPostgres = async (req, res) => {
  try {
    const reports = await getReports(pool);

    console.log(`✅ ${reports.length} signalements récupérés depuis PostgreSQL`);

    res.status(200).json({
      success: true,
      data: reports,
      count: reports.length
    });
  } catch (error) {
    console.error('❌ Erreur getAllReportsFromPostgres:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection('reports_traites').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Signalement non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data()
      }
    });
  } catch (error) {
    console.error('❌ Erreur getReportById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

const getReportsByCity = async (req, res) => {
  try {
    const { city } = req.params;
    const reportsRef = db.collection('reports_traites');
    const snapshot = await reportsRef.where('city', '==', city).get();

    const reports = [];
    snapshot.forEach(doc => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json({
      success: true,
      data: reports,
      count: reports.length
    });
  } catch (error) {
    console.error('❌ Erreur getReportsByCity:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

module.exports = {
  getAllReports,
  getAllReportsFromPostgres,
  getReportById,
  getReportsByCity,
  getReportSyncs
};
