import { collection, getDocs, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Report, ReportData } from '../types/report.types';

export class FirestoreService {
  async getReportTraites(): Promise<Report[]> {
    const q = query(collection(db, 'report_traites'), orderBy('progress', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as any;
      return {
        id: d.id,
        city: data.city || '',
        company_name: data.company_name || '',
        progress: Number(data.progress) || 0,
        report_status_id: String(data.report_status_id || ''),
        budget: Number(data.budget) || 0
      };
    });
  }

  async getReportTraitesRaw() {
    const snap = await getDocs(collection(db, 'report_traites'));
    return snap.docs;
  }

  async getReportsRaw() {
    const snap = await getDocs(collection(db, 'reports'));
    return snap.docs;
  }

  async addReport(reportData: ReportData) {
    return await addDoc(collection(db, 'reports'), {
      ...reportData,
      reported_at: serverTimestamp()
    });
  }
}

export const firestoreService = new FirestoreService();
