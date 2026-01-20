const admin = require('firebase-admin');
const { Pool } = require('pg');
const path = require('path');

// Charger les credentials Firebase
const serviceAccount = require(path.join(__dirname, '../api/firebase-credentials.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Connexion PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'routes_db',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin',
});

// Récupérer les arguments
const email = process.argv[2];
const password = process.argv[3];
const username = process.argv[4] || email.split('@')[0];

if (!email || !password) {
  console.error('❌ Usage: node scripts/create-admin-employee.js <email> <password> [username]');
  console.error('❌ Exemple: node scripts/create-admin-employee.js admin@example.com MonMotDePasse123! Admin');
  process.exit(1);
}

async function createAdminEmployee(userEmail, userPassword, userName) {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Création de l\'employé admin...');
    
    // 1. Créer l'utilisateur Firebase
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email: userEmail,
        password: userPassword,
        emailVerified: true,
        displayName: userName
      });
      console.log('✅ Utilisateur Firebase créé');
      console.log(`   UID: ${userRecord.uid}`);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log('⚠️  Utilisateur Firebase existe déjà, récupération...');
        userRecord = await admin.auth().getUserByEmail(userEmail);
      } else {
        throw error;
      }
    }
    
    // 2. Définir le rôle admin dans Firebase
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
    console.log('✅ Rôle admin Firebase attribué');
    
    // 3. Vérifier/créer le rôle admin dans la base
    await client.query('BEGIN');
    
    let adminRoleId;
    const roleResult = await client.query(
      "SELECT id FROM roles WHERE name = 'admin'"
    );
    
    if (roleResult.rows.length === 0) {
      const insertRole = await client.query(
        "INSERT INTO roles (name) VALUES ('admin') RETURNING id"
      );
      adminRoleId = insertRole.rows[0].id;
      console.log('✅ Rôle admin créé dans la base');
    } else {
      adminRoleId = roleResult.rows[0].id;
    }
    
    // 4. Créer/mettre à jour l'employé dans la base
    const existingEmployee = await client.query(
      'SELECT id FROM employees WHERE firebase_uid = $1',
      [userRecord.uid]
    );
    
    if (existingEmployee.rows.length === 0) {
      await client.query(
        `INSERT INTO employees (firebase_uid, username, email, role_id)
         VALUES ($1, $2, $3, $4)`,
        [userRecord.uid, userName, userEmail, adminRoleId]
      );
      console.log('✅ Employé créé dans la base locale');
    } else {
      await client.query(
        `UPDATE employees 
         SET username = $2, email = $3, role_id = $4
         WHERE firebase_uid = $1`,
        [userRecord.uid, userName, userEmail, adminRoleId]
      );
      console.log('✅ Employé mis à jour dans la base locale');
    }
    
    await client.query('COMMIT');
    
    console.log('');
    console.log('🎉 Employé admin créé avec succès !');
    console.log('');
    console.log('📝 Informations de connexion :');
    console.log(`   Email: ${userEmail}`);
    console.log(`   Password: ${userPassword}`);
    console.log(`   Username: ${userName}`);
    console.log(`   Firebase UID: ${userRecord.uid}`);
    console.log('');
    console.log('🌐 Vous pouvez maintenant vous connecter sur http://localhost');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

// Exécuter
createAdminEmployee(email, password, username);