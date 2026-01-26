const admin = require('firebase-admin');

let firebaseApp;
let db;

try {
  // Charger les credentials depuis le fichier JSON
  const serviceAccount = require('./firebase-credentials.json');

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  // AJOUTER CETTE LIGNE : Initialiser Firestore
  db = admin.firestore();

  console.log('✓ Firebase Admin initialisé');
  console.log('✓ Firestore initialisé');
} catch (error) {
  console.error('Erreur initialisation Firebase:', error.message);
  throw error;
}
 
module.exports = {
  auth: admin.auth(),
  db, 
  admin,
  firebaseApp
};