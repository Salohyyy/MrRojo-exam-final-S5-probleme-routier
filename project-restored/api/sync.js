const { db } = require('./firebase-config');
const admin = require('firebase-admin');

// Synchroniser un report vers Firebase (collection "reports")
async function syncReportToFirebase(report) {
  try {
    const reportRef = db.collection('reports').doc(report.id.toString());
    await reportRef.set({
      postgres_report_id: report.id.toString(),
      city: report.city,
      is_synced: report.is_synced || false,
      latitude: parseFloat(report.latitude),
      longitude: parseFloat(report.longitude),
      problem_type_id: parseInt(report.problem_type_id),
      report_status_id: parseInt(report.report_status_id),
      reported_at: admin.firestore.Timestamp.fromDate(new Date(report.reported_at)),
      user_id: report.user_id.toString()
    }, { merge: true });
    
    console.log(`✅ Report ${report.id} synchronisé vers Firebase`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur sync report ${report.id}:`, error);
    return false;
  }
}

// Synchroniser un report_sync vers Firebase (collection "report_traites")
async function syncReportSyncToFirebase(reportSync, reportData) {
  try {
    const syncRef = db.collection('report_traites').doc(reportSync.id.toString());
    await syncRef.set({
      budget: parseFloat(reportSync.budget) || 0,
      city: reportData.city,
      company_id: reportSync.company_id.toString(),
      company_name: reportData.company_name,
      latitude: parseFloat(reportData.latitude),
      longitude: parseFloat(reportData.longitude),
      original_firebase_id: null,
      postgres_report_id: reportSync.report_id.toString(),
      problem_type_id: reportData.problem_type_id.toString(),
      progress: parseFloat(reportSync.progress) || 0,
      report_status_id: reportSync.report_status_id.toString(),
      surface: reportSync.surface.toString(),
      synced_at: admin.firestore.Timestamp.now()
    }, { merge: true });
    
    console.log(`✅ ReportSync ${reportSync.id} synchronisé vers Firebase (report_traites)`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur sync reportSync ${reportSync.id}:`, error);
    return false;
  }
}

module.exports = {
  syncReportToFirebase,
  syncReportSyncToFirebase
};