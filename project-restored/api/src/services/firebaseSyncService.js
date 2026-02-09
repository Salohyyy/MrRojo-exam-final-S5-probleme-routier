const { db, admin } = require('../config/firebase');

// Synchroniser un report vers Firebase (collection "reports")
async function syncReportToFirebase(report) {
  try {
    const reportRef = db.collection('reports').doc(report.id.toString());
    const payload = {
      postgres_report_id: safeString(report.id),
      city: safeString(report.city),
      is_synced: !!report.is_synced,
      latitude: safeNumber(report.latitude),
      longitude: safeNumber(report.longitude),
      problem_type_id: safeNumber(report.problem_type_id),
      report_status_id: safeNumber(report.report_status_id),
      reported_at: safeTimestamp(report.reported_at),
      user_id: safeString(report.user_id)
    };
    await reportRef.set(payload, { merge: true });
    
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
    const payload = {
      budget: safeNumber(reportSync.budget),
      city: safeString(reportData?.city),
      company_id: safeString(reportSync.company_id),
      company_name: safeString(reportData?.company_name),
      latitude: safeNumber(reportData?.latitude),
      longitude: safeNumber(reportData?.longitude),
      original_firebase_id: null,
      postgres_report_id: safeString(reportSync.report_id),
      problem_type_id: safeString(reportData?.problem_type_id),
      progress: safeNumber(reportSync.progress),
      report_status_id: safeString(reportSync.report_status_id),
      surface: safeString(reportSync.surface),
      synced_at: new Date()
    };
    await syncRef.set(payload, { merge: true });
    
    console.log(`✅ ReportSync ${reportSync.id} synchronisé vers Firebase (report_traites)`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur sync reportSync ${reportSync.id}:`, error);
    return false;
  }
}

function safeNumber(value) {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function safeString(value) {
  if (value === undefined || value === null) return null;
  return value.toString();
}

function safeTimestamp(value) {
  if (!value) return admin.firestore.Timestamp.now();
  const date = value instanceof Date ? value : new Date(value);
  return admin.firestore.Timestamp.fromDate(date);
}

module.exports = {
  syncReportToFirebase,
  syncReportSyncToFirebase
};
