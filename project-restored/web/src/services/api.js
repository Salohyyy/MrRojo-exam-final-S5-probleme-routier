const API_URL = 'http://localhost:4000';

export const getReportSyncs = async () => {
  const response = await fetch(`${API_URL}/api/report-syncs`);
  if (!response.ok) {
    throw new Error(`Erreur HTTP: ${response.status}`);
  }
  return response.json();
};

export const getReportStatuses = async () => {
  const response = await fetch(`${API_URL}/api/report-statuses`);
  if (!response.ok) {
    throw new Error(`Erreur HTTP: ${response.status}`);
  }
  return response.json();
};

export const updateReportSyncStatus = async (id, statusId, progress) => {
  const body = { report_status_id: statusId };
  if (progress !== undefined) {
    body.progress = progress;
  }

  const response = await fetch(`${API_URL}/api/report-syncs/${id}/status`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    throw new Error(`Erreur HTTP: ${response.status}`);
  }
  return response.json();
};
