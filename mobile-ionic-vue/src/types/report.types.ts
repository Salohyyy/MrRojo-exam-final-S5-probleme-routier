export interface Report {
  id: string;
  city: string;
  company_name: string;
  progress: number;
  report_status_id: string;
  budget: number;
  problem_type_id?: string | number;
}

export interface ReportTraite {
  id: string;
  city?: string;
  company_name?: string;
  progress?: number;
  report_status_id?: string | number;
  budget?: number;
  latitude?: number;
  longitude?: number;
  postgres_report_id?: string | number;
  problem_type_id?: string | number;
}

export interface ReportData {
  city?: string;
  is_synced: boolean;
  latitude: number;
  longitude: number;
  postgres_report_id: null;
  problem_type_id: number;
  report_status_id: number;
  reported_at: any;
  user_id: string;
  photos?: string[]; // URLs des photos dans Firebase Storage
}

export interface ProblemStyle {
  color: string;
  fillColor: string;
  label: string;
  icon?: string;
}
