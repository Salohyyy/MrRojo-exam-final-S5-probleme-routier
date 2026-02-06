const http = require('http');

const API_URL = 'http://localhost:4000/api';

const endpoints = [
  { name: 'Health Check', url: 'http://localhost:4000/health' },
  { name: 'Visiteur - Reports (Firebase)', url: `${API_URL}/visitor/reports` },
  { name: 'Visiteur - Reports (PostgreSQL)', url: `${API_URL}/visitor/reports/postgres` },
  { name: 'Manager - Sync Status', url: `${API_URL}/manager/report-syncs` },
  { name: 'Manager - Status List', url: `${API_URL}/manager/report-statuses` }
];

async function testEndpoint(endpoint) {
  console.log(`\nTesting ${endpoint.name}...`);
  console.log(`GET ${endpoint.url}`);
  
  try {
    const response = await fetch(endpoint.url);
    const status = response.status;
    const contentType = response.headers.get('content-type');
    
    console.log(`Status: ${status}`);
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (Array.isArray(data.data)) {
        console.log(`Result: ${data.data.length} items found`);
        if (data.data.length > 0) {
          console.log('Sample item:', JSON.stringify(data.data[0], null, 2).substring(0, 200) + '...');
        }
      } else {
        console.log('Result:', JSON.stringify(data, null, 2).substring(0, 300));
      }
    } else {
      const text = await response.text();
      console.log('Response (text):', text.substring(0, 200));
    }
    
    if (status >= 200 && status < 300) {
      console.log('✅ SUCCÈS');
    } else {
      console.log('❌ ÉCHEC');
    }
  } catch (error) {
    console.error('❌ ERREUR DE CONNEXION:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Démarrage des tests API...');
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
  console.log('\n🏁 Tests terminés.');
}

runTests();
