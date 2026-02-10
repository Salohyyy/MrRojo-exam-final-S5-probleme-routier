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

    console.log(` ${reports.length} signalements récupérés depuis Firebase (reports_traites)`);
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

    console.log(` ${reports.length} signalements récupérés depuis PostgreSQL`);

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

// GET /api/visitor/reports/combined
// Combine les données PostgreSQL (locales) avec optionnellement Firebase
// Retourne tous les signalements avec leur source (local ou firebase)
const getCombinedReports = async (req, res) => {
  try {
    const pool = require('../config/database');
    
    // 1. Récupérer tous les report_syncs (données locales avec modifications)
    const localReportsResult = await pool.query(`
      SELECT 
        rs.id as sync_id,
        rs.surface,
        rs.budget,
        rs.progress,
        rs.report_status_id,
        rs.sent_to_firebase,
        rst.name as status_name,
        c.name as company_name,
        c.address as company_address,
        r.id as report_id,
        r.longitude,
        r.latitude,
        r.city,
        r.reported_at,
        r.firebase_id,
        r.is_synced,
        r.problem_type_id,
        pt.name as problem_type_name
      FROM report_syncs rs
      JOIN report_statuses rst ON rs.report_status_id = rst.id
      JOIN companies c ON rs.company_id = c.id
      JOIN reports r ON rs.report_id = r.id
      JOIN problem_types pt ON r.problem_type_id = pt.id
      ORDER BY rs.id DESC
    `);

    const localReports = localReportsResult.rows.map(r => ({
      ...r,
      id: `local_${r.sync_id}`,
      source: 'local', // Données PostgreSQL (modifications locales)
      is_processed: true // A été traité par un gestionnaire
    }));

    // 2. Récupérer les reports Firebase (signalements bruts non traités) avec timeout
    let firebaseReports = [];
    const FIREBASE_TIMEOUT = 5000; // 5 secondes timeout

    try {
      // Vérifier que Firebase est initialisé
      if (!db) {
        console.warn('⚠️ Firebase non initialisé, mode local uniquement');
      } else {
        // Créer une promesse avec timeout
        const firebasePromise = db.collection('reports').get();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Firebase timeout')), FIREBASE_TIMEOUT)
        );

        const reportsSnapshot = await Promise.race([firebasePromise, timeoutPromise]);
        
        const processedFirebaseIds = localReports
          .filter(r => r.firebase_id)
          .map(r => r.firebase_id);

        reportsSnapshot.forEach(doc => {
          // Ne pas inclure ceux déjà dans report_syncs
          if (!processedFirebaseIds.includes(doc.id)) {
            const data = doc.data();
            firebaseReports.push({
              id: `firebase_${doc.id}`,
              firebase_id: doc.id,
              longitude: data.longitude,
              latitude: data.latitude,
              city: data.city || 'Non spécifié',
              reported_at: data.reported_at?.toDate?.() || new Date(),
              problem_type_id: data.problem_type_id,
              problem_type_name: getProblemTypeName(data.problem_type_id),
              report_status_id: data.report_status_id || 1,
              status_name: 'Signalé',
              progress: 0,
              source: 'firebase', // Non encore traité localement
              is_processed: false
            });
          }
        });
      }
    } catch (firebaseError) {
      console.warn('⚠️ Firebase non accessible, mode local uniquement:', firebaseError.message);
    }

    const combined = [...localReports, ...firebaseReports];

    res.status(200).json({
      success: true,
      data: combined,
      count: combined.length,
      breakdown: {
        local: localReports.length,
        firebase_pending: firebaseReports.length
      }
    });
  } catch (error) {
    console.error('❌ Erreur getCombinedReports:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// Helper pour obtenir le nom du type de problème
const getProblemTypeName = (id) => {
  const types = {
    1: 'Nid de poule',
    2: 'Chaussée dégradée',
    3: 'Lampadaires',
    4: 'Fissure',
    5: 'Glissement',
    6: 'Inondation'
  };
  return types[id] || 'Non spécifié';
};

module.exports = {
  getAllReports,
  getAllReportsFromPostgres,
  getReportById,
  getReportsByCity,
  getReportSyncs,
  getCombinedReports
};
