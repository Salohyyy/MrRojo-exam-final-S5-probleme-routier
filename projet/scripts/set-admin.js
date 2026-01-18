const admin = require('firebase-admin');
const path = require('path');

// Charger les credentials Firebase
const serviceAccount = require(path.join(__dirname, '../api/firebase-credentials.json'));

// Initialiser Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// L'email de l'utilisateur à promouvoir admin
const email = process.argv[2]; // Récupérer l'email depuis la ligne de commande

if (!email) {
  console.error('❌ Usage: node scripts/set-admin.js <email>');
  console.error('❌ Exemple: node scripts/set-admin.js admin@example.com');
  process.exit(1);
}

// Fonction pour définir le rôle admin
async function setAdminRole(userEmail) {
  try {
    // Récupérer l'utilisateur par email
    const user = await admin.auth().getUserByEmail(userEmail);
    
    // Définir les custom claims (rôle admin)
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    console.log('✅ Rôle admin attribué avec succès !');
    console.log(`✅ Email: ${userEmail}`);
    console.log(`✅ UID: ${user.uid}`);
    console.log('');
    console.log('⚠️  L\'utilisateur doit se déconnecter et se reconnecter pour que les changements prennent effet.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.error('❌ Utilisateur non trouvé. Créez d\'abord l\'utilisateur dans Firebase Console.');
    }
  } finally {
    process.exit(0);
  }
}

// Exécuter
setAdminRole(email);