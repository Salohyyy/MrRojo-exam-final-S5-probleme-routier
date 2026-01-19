const admin = require('firebase-admin');

// Remplacez par votre fichier serviceAccountKey.json téléchargé depuis Firebase
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = { admin, db };