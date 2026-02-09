const admin = require('firebase-admin');

let firebaseApp;
let db;

try {
  const serviceAccount = require('/app/firebase-credentials.json');

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  db = admin.firestore();

  console.log('✓ Firebase Admin initialisé');

  // --- FONCTION DE TEST DES COLLECTIONS ---
  const testFirestore = async () => {
    try {
      console.log('🔍 Test de connexion Firestore en cours...');
      const collections = await db.listCollections();
      
      if (collections.length === 0) {
        console.log('⚠️ Firestore connecté, mais AUCUNE collection trouvée.');
      } else {
        const names = collections.map(col => col.id).join(', ');
        console.log(`✅ Collections Firestore trouvées : [ ${names} ]`);
      }
    } catch (err) {
      console.error('❌ Erreur lors du listing des collections :', err.message);
      // C'est ici que l'erreur 16 UNAUTHENTICATED réapparaîtra si l'heure est mauvaise
    }
  };

  testFirestore();
  // ----------------------------------------

} catch (error) {
  console.error('Erreur initialisation Firebase:', error.message);
}

module.exports = {
  get auth() { return admin.auth(); },
  get db() { return db; },
  admin,
  firebaseApp
};