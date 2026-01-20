const admin = require("firebase-admin");
const path = require("path");

let db;

try {
  // Vérifier si Firebase n'est pas déjà initialisé
  if (!admin.apps.length) {
    // Utiliser ./ pour cibler le fichier dans le même dossier
    const serviceAccount = require("./firebase.json");

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Admin connecté avec succès via JSON");
  }
  
  db = admin.firestore();
} catch (error) {
  console.error("❌ Erreur critique Firebase Config:", error.message);
}

// On exporte db et admin pour les utiliser ailleurs
module.exports = { admin, db };