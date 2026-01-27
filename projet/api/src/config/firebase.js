const admin = require('firebase-admin');
const path = require('path');

let firebaseApp;

try {
  const serviceAccount = require(path.join(__dirname, '../../firebase-credentials.json'));
  
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✓ Firebase Admin initialisé');
} catch (error) {
  console.error('Erreur initialisation Firebase:', error.message);
}

module.exports = {
  auth: admin.auth(),
  firebaseApp
};