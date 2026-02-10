const admin = require('firebase-admin');
const path = require('path');

// REMPLACEZ CECI par le nom exact de votre fichier JSON téléchargé
const serviceAccount = require("./firebase-credentials.json");

console.log("--- 🏁 Démarrage du test de connexion ---");

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    const db = admin.firestore();

    async function testConnection() {
        console.log("--- 🔍 Tentative de lecture des collections ---");
        
        // 1. Lister toutes les collections disponibles
        const collections = await db.listCollections();
        
        if (collections.length === 0) {
            console.log("⚠️ Connexion réussie, mais AUCUNE collection trouvée dans cette base.");
            return;
        }

        console.log(` Succès ! ${collections.length} collection(s) trouvée(s) :`);
        
        for (let col of collections) {
            console.log(`   - Nom : ${col.id}`);
            
            // 2. Tester la lecture de la première collection pour voir les données
            const snapshot = await db.collection(col.id).limit(1).get();
            if (!snapshot.empty) {
                console.log(`     📍 Exemple de donnée dans [${col.id}] :`, snapshot.docs[0].data());
            } else {
                console.log(`     [${col.id}] est vide.`);
            }
        }
    }

    testConnection().catch(err => {
        console.error("❌ Erreur lors de l'exécution :");
        console.error(err);
    });

} catch (err) {
    console.error("❌ Erreur d'initialisation (vérifiez votre fichier JSON) :");
    console.error(err.message);
}