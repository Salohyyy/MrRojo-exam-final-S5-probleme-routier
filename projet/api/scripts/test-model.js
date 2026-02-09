const { pool } = require('../src/config/database');
const reportSyncModel = require('../src/models/reportSyncModel');

async function test() {
  try {
    console.log('Testing getAllReportSyncs...');
    const result = await reportSyncModel.getAllReportSyncs();
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // We can't easily close the pool if it's not exported with an end method, 
    // but process.exit will do.
    process.exit(0);
  }
}

test();
