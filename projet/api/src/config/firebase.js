const admin = require('firebase-admin');
const path = require('path');

let firebaseApp;

try {
  // Charger les credentials depuis le fichier JSON
  const serviceAccount = require(path.join(__dirname, '../../firebase-credentials.json'));
  
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✓ Firebase Admin initialisé');
} catch (error) {
  console.error('Erreur initialisation Firebase:', error.message);
  // En production, vous devriez utiliser les variables d'environnement
  // pour plus de sécurité
}

module.exports = {
  auth: admin.auth(),
  firebaseApp
};