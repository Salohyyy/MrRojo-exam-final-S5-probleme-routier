const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { Pool } = require("pg");

const serviceAccount = require("./config/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

// Configuration PostgreSQL
const pool = new Pool({
  user: "postgres",
  password: "steve",
  host: "localhost",
  port: 5432,
  database: "signalapp"
});

app.use(cors());
app.use(express.json());

// ========================
// SIGNUP / CREATE USER
// ========================
app.post("/signup", async (req, res) => {
  const { email, password, nom } = req.body;

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: nom
    });

    res.status(201).json({
      uid: userRecord.uid,
      email: userRecord.email,
      message: "Utilisateur créé"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// LOGIN
// ========================
app.post("/login", async (req, res) => {
  const { uid } = req.body;
  try {
    const token = await admin.auth().createCustomToken(uid);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========================
// MIDDLEWARE AUTHENTICATION
// ========================
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant" });
  }
  const idToken = authHeader.split(" ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: "Token invalide" });
  }
};

// ========================
// HELPER: Créer/Récupérer utilisateur PostgreSQL
// ========================
const syncUserToPostgres = async (firebaseUser) => {
  try {
    const result = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [firebaseUser.email]
    );

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    const insertResult = await pool.query(
      "INSERT INTO users (username, email, user_status_id) VALUES ($1, $2, $3) RETURNING id",
      [firebaseUser.displayName || firebaseUser.email, firebaseUser.email, 1]
    );

    return insertResult.rows[0].id;
  } catch (error) {
    console.error("Erreur sync utilisateur:", error);
    throw error;
  }
};

// ========================
// CREATE REPORT (Mobile User)
// ========================
app.post("/create_firebase_reports", async (req, res) => {
  try {
    const { longitude, latitude, city, problemTypeId } = req.body;

    const firebaseData = {
      reported_at: admin.firestore.FieldValue.serverTimestamp(),
      longitude: Number(longitude),
      latitude: Number(latitude),
      city: city,
      is_synced: false,
      report_status_id: 1,
      problem_type_id: problemTypeId || 1,
      user_id: req.user.uid
    };

    const docRef = await db.collection("reports").add(firebaseData);
    
    res.status(201).json({
      firebaseId: docRef.id,
      message: "Signalement créé dans Firebase"
    });
  } catch (error) {
    console.error("Erreur création report:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========================
// SYNC FIREBASE → POSTGRES (Manager: Téléchargement)
// ========================
app.post("/sync/download", async (req, res) => {
  const client = await pool.connect();
  let syncCount = 0;

  try {
    await client.query("BEGIN");

    // Récupérer les reports non synchronisés depuis Firebase
    const snapshot = await db
      .collection("reports")
      .where("is_synced", "==", false)
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Synchroniser l'utilisateur
      const postgresUserId = await syncUserToPostgres({
        email: `${data.user_id}@firebase.local`,
        displayName: data.user_id
      });

      // Insérer le report dans PostgreSQL
      const result = await client.query(
        `INSERT INTO reports (
          reported_at, longitude, latitude, city, is_synced,
          report_status_id, problem_type_id, user_id, firebase_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          data.reported_at?.toDate() || new Date(),
          Number(data.longitude),
          Number(data.latitude),
          data.city,
          true,
          data.report_status_id,
          data.problem_type_id,
          postgresUserId,
          doc.id
        ]
      );

      const postgresReportId = result.rows[0].id;

      // Marquer comme synchronisé dans Firebase
      await doc.ref.update({
        is_synced: true,
        postgres_report_id: postgresReportId
      });

      syncCount++;
    }

    await client.query("COMMIT");

    res.json({
      message: `${syncCount} signalements téléchargés depuis Firebase`,
      count: syncCount
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erreur synchronisation download:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ========================
// GET ALL REPORTS (Manager: Vue locale)
// ========================
app.get("/reports/local", async (req, res) => {
  try {
    const { filter } = req.query; // filter: 'all', 'sent', 'not_sent'

    let query = `
      SELECT 
        r.id, r.reported_at, r.longitude, r.latitude, r.city, 
        r.is_synced, r.report_status_id, r.problem_type_id, r.firebase_id,
        rs.id as sync_id, rs.surface, rs.budget, rs.progress, rs.sent_to_firebase,
        c.name as company_name,
        rstat.name as status_name, 
        pt.name as problem_type_name,
        u.username
      FROM reports r
      LEFT JOIN report_syncs rs ON r.id = rs.report_id
      LEFT JOIN companies c ON rs.company_id = c.id
      LEFT JOIN report_statuses rstat ON r.report_status_id = rstat.id
      LEFT JOIN problem_types pt ON r.problem_type_id = pt.id
      LEFT JOIN users u ON r.user_id = u.id
    `;

    if (filter === 'sent') {
      query += ` WHERE rs.sent_to_firebase = true`;
    } else if (filter === 'not_sent') {
      query += ` WHERE rs.sent_to_firebase = false OR rs.sent_to_firebase IS NULL`;
    }

    query += ` ORDER BY r.reported_at DESC`;

    const result = await pool.query(query);

    res.json(result.rows);
  } catch (error) {
    console.error("Erreur lecture reports:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========================
// GET SINGLE REPORT (Manager: Détails)
// ========================
app.get("/reports/local/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        r.*, 
        rs.id as sync_id, rs.surface, rs.budget, rs.progress, 
        rs.sent_to_firebase, rs.company_id,
        c.name as company_name,
        rstat.name as status_name,
        pt.name as problem_type_name,
        u.username
      FROM reports r
      LEFT JOIN report_syncs rs ON r.id = rs.report_id
      LEFT JOIN companies c ON rs.company_id = c.id
      LEFT JOIN report_statuses rstat ON r.report_status_id = rstat.id
      LEFT JOIN problem_types pt ON r.problem_type_id = pt.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Report non trouvé" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erreur lecture report:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========================
// UPDATE REPORT (Manager: Ajout surface, budget, entreprise)
// ========================
app.put("/reports/local/:id", async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { surface, budget, companyId, reportStatusId, progress } = req.body;

    await client.query("BEGIN");

    // Vérifier si un report_sync existe déjà
    const syncCheck = await client.query(
      "SELECT id FROM report_syncs WHERE report_id = $1",
      [id]
    );

    if (syncCheck.rows.length > 0) {
      // Update existant
      await client.query(
        `UPDATE report_syncs 
         SET surface = $1, budget = $2, progress = $3, 
             report_status_id = $4, company_id = $5, sent_to_firebase = false
         WHERE report_id = $6`,
        [surface, budget || 0, progress || 0, reportStatusId || 1, companyId, id]
      );
    } else {
      // Créer nouveau report_sync
      await client.query(
        `INSERT INTO report_syncs 
         (surface, budget, progress, report_status_id, company_id, report_id, sent_to_firebase)
         VALUES ($1, $2, $3, $4, $5, $6, false)`,
        [surface, budget || 0, progress || 0, reportStatusId || 1, companyId, id]
      );
    }

    // Mettre à jour le status du report principal
    await client.query(
      "UPDATE reports SET report_status_id = $1 WHERE id = $2",
      [reportStatusId || 1, id]
    );

    await client.query("COMMIT");

    res.json({ message: "Report mis à jour avec succès" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erreur mise à jour report:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ========================
// SYNC POSTGRES → FIREBASE (Manager: Upload des reports traités)
// ========================
app.post("/sync/upload", async (req, res) => {
  const client = await pool.connect();
  let uploadCount = 0;

  try {
    await client.query("BEGIN");

    // Récupérer les reports traités non envoyés
    const result = await pool.query(
      `SELECT 
        r.id, r.firebase_id, r.longitude, r.latitude, r.city,
        r.report_status_id, r.problem_type_id,
        rs.surface, rs.budget, rs.progress, rs.company_id,
        c.name as company_name
      FROM reports r
      INNER JOIN report_syncs rs ON r.id = rs.report_id
      LEFT JOIN companies c ON rs.company_id = c.id
      WHERE rs.sent_to_firebase = false OR rs.sent_to_firebase IS NULL`
    );

    for (const row of result.rows) {
      // Créer le document dans la collection "reports_traites"
      const firebaseData = {
        original_firebase_id: row.firebase_id,
        postgres_report_id: row.id,
        longitude: Number(row.longitude),
        latitude: Number(row.latitude),
        city: row.city,
        surface: row.surface,
        budget: Number(row.budget),
        progress: Number(row.progress),
        report_status_id: row.report_status_id,
        problem_type_id: row.problem_type_id,
        company_id: row.company_id,
        company_name: row.company_name,
        synced_at: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection("reports_traites").add(firebaseData);

      // Marquer comme envoyé dans PostgreSQL
      await client.query(
        "UPDATE report_syncs SET sent_to_firebase = true WHERE report_id = $1",
        [row.id]
      );

      uploadCount++;
    }

    await client.query("COMMIT");

    res.json({
      message: `${uploadCount} signalements traités envoyés vers Firebase`,
      count: uploadCount
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erreur synchronisation upload:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ========================
// UPLOAD SINGLE REPORT
// ========================
app.post("/reports/local/:id/upload", async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    const result = await pool.query(
      `SELECT 
        r.id, r.firebase_id, r.longitude, r.latitude, r.city,
        r.report_status_id, r.problem_type_id,
        rs.surface, rs.budget, rs.progress, rs.company_id,
        c.name as company_name
      FROM reports r
      INNER JOIN report_syncs rs ON r.id = rs.report_id
      LEFT JOIN companies c ON rs.company_id = c.id
      WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Report non trouvé" });
    }

    const row = result.rows[0];

    const firebaseData = {
      original_firebase_id: row.firebase_id,
      postgres_report_id: row.id,
      longitude: Number(row.longitude),
      latitude: Number(row.latitude),
      city: row.city,
      surface: row.surface,
      budget: Number(row.budget),
      progress: Number(row.progress),
      report_status_id: row.report_status_id,
      problem_type_id: row.problem_type_id,
      company_id: row.company_id,
      company_name: row.company_name,
      synced_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("reports_traites").add(firebaseData);

    await client.query(
      "UPDATE report_syncs SET sent_to_firebase = true WHERE report_id = $1",
      [id]
    );

    await client.query("COMMIT");

    res.json({ message: "Report envoyé vers Firebase avec succès" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erreur upload report:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ========================
// GET COMPANIES (Pour le formulaire)
// ========================
app.get("/companies", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, address FROM companies ORDER BY name");
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur lecture companies:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========================
// GET REPORT STATUSES (Pour le formulaire)
// ========================
app.get("/report-statuses", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, level FROM report_statuses ORDER BY level");
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur lecture statuses:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========================
// START SERVER
// ========================
app.listen(4000, () => {
  console.log("API Firebase-PostgreSQL démarrée sur http://localhost:4000");
});