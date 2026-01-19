const admin = require("firebase-admin");
const path = require("path");

// On définit le chemin vers le fichier JSON
try {
  const serviceAccount = require("../../firebase-key.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log("✅ Firebase connecté avec le fichier JSON !");
} catch (error) {
  console.error("❌ Erreur lors de la lecture du fichier JSON:", error.message);
}

const db = admin.firestore();
// ... reste de ton code testFirestore()

async function testFirestore() {
  try {
    console.log('🔄 Test de connexion à Firestore...');
    
    // Récupérer la collection reports-traite
    const snapshot = await db.collection('reports-traite').limit(3).get();
    
    if (snapshot.empty) {
      console.log('⚠️  La collection "reports-traite" est vide');
    } else {
      console.log(`✅ ${snapshot.size} document(s) récupéré(s) avec succès!\n`);
      
      console.log('📄 Exemple de données:');
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`\n- ID: ${doc.id}`);
        console.log(`  Ville: ${data.city}`);
        console.log(`  Société: ${data.company_name}`);
        console.log(`  Budget: ${data.budget}`);
        console.log(`  Latitude: ${data.latitude}`);
        console.log(`  Longitude: ${data.longitude}`);
      });
    }
    
    console.log('\n🎉 Test réussi! Ta configuration Firebase fonctionne correctement.');
  } catch (error) {
    console.error('❌ Erreur lors du test Firestore:', error.message);
    console.error('\n💡 Vérifications à faire:');
    console.error('  1. Les credentials Firebase sont-ils corrects?');
    console.error('  2. Le nom de la collection est-il "reports-traite"?');
    console.error('  3. As-tu les permissions de lecture sur Firestore?');
  }
}

testFirestore();