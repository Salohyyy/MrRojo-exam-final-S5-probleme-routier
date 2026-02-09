const reportModel = require('../models/reportModel');
const reportSyncModel = require('../models/reportSyncModel');
const statusModel = require('../models/statusModel');
const firebaseSyncService = require('../services/firebaseSyncService');

const getReports = async (req, res) => {
  try {
    const reports = await reportModel.getAllReports();
    res.json(reports);
  } catch (err) {
    console.error('❌ Erreur getReports:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
};

const getReportSyncs = async (req, res) => {
  try {
    console.log('📡 Requête reçue pour /api/report-syncs');
    const syncs = await reportSyncModel.getAllReportSyncs();
    console.log(`✅ ${syncs.length} report_syncs trouvés`);
    res.json(syncs);
  } catch (err) {
    console.error('❌ Erreur getReportSyncs:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
};

const getStatuses = async (req, res) => {
  try {
    console.log('📡 Requête reçue pour /api/report-statuses');
    const statuses = await statusModel.getAllStatuses();
    console.log(`✅ ${statuses.length} statuts trouvés`);
    res.json(statuses);
  } catch (err) {
    console.error('❌ Erreur getStatuses:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
};

const updateReportStatus = async (req, res) => {
  const { id } = req.params;
  const { report_status_id } = req.body;
  
  try {
    const updatedReport = await reportModel.updateReportStatus(id, report_status_id);
    
    if (!updatedReport) {
      return res.status(404).json({ error: 'Report non trouvé' });
    }
    
    // Synchroniser vers Firebase
    await firebaseSyncService.syncReportToFirebase(updatedReport);
    
    res.json({ 
      success: true, 
      data: updatedReport,
      message: '✅ Statut mis à jour dans PostgreSQL et Firebase'
    });
  } catch (err) {
    console.error('❌ Erreur updateReportStatus:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
};

const updateReportSyncStatus = async (req, res) => {
  const { id } = req.params;
  const { report_status_id, progress } = req.body;
  
  console.log(`📡 Requête de mise à jour reçue pour report_sync #${id}`);
  
  try {
    const updatedSync = await reportSyncModel.updateReportSyncStatus(id, report_status_id, progress);
    
    if (!updatedSync) {
      return res.status(404).json({ error: 'Report sync non trouvé' });
    }
    
    // Fetch full data for Firebase
    const fullData = await reportSyncModel.getReportSyncFullData(id);
    
    // Sync to Firebase
    await firebaseSyncService.syncReportSyncToFirebase(updatedSync, fullData);
    
    res.json({ 
      success: true, 
      data: updatedSync,
      message: '✅ Statut mis à jour dans PostgreSQL et Firebase'
    });
  } catch (err) {
    console.error('❌ Erreur updateReportSyncStatus:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
};

const syncAllToFirebase = async (req, res) => {
  try {
    let syncCount = 0;
    
    const reports = await reportModel.getAllReports();
    for (const report of reports) {
      await firebaseSyncService.syncReportToFirebase(report);
      syncCount++;
    }
    
    const reportSyncs = await reportSyncModel.getAllReportSyncsWithDetails();
    for (const sync of reportSyncs) {
      await firebaseSyncService.syncReportSyncToFirebase(sync, sync);
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
};

module.exports = {
  getReports,
  getReportSyncs,
  getStatuses,
  updateReportStatus,
  updateReportSyncStatus,
  syncAllToFirebase
};
