const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { Pool } = require("pg");

const serviceAccount = require("./serviceAccountKey.json");

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

        // Créer nouvel utilisateur en base (status_id: 1 = actif par défaut)
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
// CREATE REPORT
// ========================
app.post("/signalements", authenticate, async (req, res) => {
    try {
        const {
            longitude,
            latitude,
            city,
            problemTypeId,
            reportStatusId
        } = req.body;

        // Données Firestore alignées SQL
        const firebaseData = {
            reported_at: admin.firestore.FieldValue.serverTimestamp(),
            longitude: Number(longitude),
            latitude: Number(latitude),
            city: city,
            is_synced: false,
            report_status_id: reportStatusId || 1,
            problem_type_id: problemTypeId || 1,
            user_id: req.user.uid // référence Firebase (logique)
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
// CREATE REPORT
// ========================
app.post("/create_sync_signalements", authenticate, async (req, res) => {
    console.log("POST signalements");
    const client = await pool.connect();

    try {
        const { reportID, surface, budget, avancemenentId } = req.body;

        // Synchroniser l'utilisateur Firebase vers PostgreSQL
        const postgresUserId = await syncUserToPostgres(req.user);

        // Créer le report dans Firestore
        const firebaseData = {
            reportID: reportID,
            surface : surface,
            budget : budget,
            avancemenentId : avancemenentId,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection("reports").add(firebaseData);
        const firebaseId = docRef.id;

        // Créer le report dans PostgreSQL
        await client.query("BEGIN");

        const reportResult = await client.query(
            `INSERT INTO reports 
             (reported_at, longitude, latitude, city, is_synced, report_status_id, problem_type_id, user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING id`,
            [
                new Date(),
                parseFloat(longitude),
                parseFloat(latitude),
                city,
                false,
                1, // status "nouveau"
                problemTypeId || 1,
                postgresUserId
            ]
        );

        const postgresReportId = reportResult.rows[0].id;

        // Créer l'entrée dans report_syncs si companyId fourni
        if (companyId) {
            await client.query(
                `INSERT INTO report_syncs 
                 (surface, budget, progress, report_status_id, company_id, report_id)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [surface, budget || 0, 0, 1, companyId, postgresReportId]
            );
        }

        await client.query("COMMIT");

        res.status(201).json({
            firebaseId,
            postgresId: postgresReportId,
            message: "Signalement créé et synchronisé"
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Erreur création report:", error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// ========================
// READ ALL REPORTS
// ========================
app.get("/signalements", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                r.id, r.reported_at, r.longitude, r.latitude, r.city, 
                r.is_synced, r.report_status_id, r.problem_type_id,
                rs.surface, rs.budget, rs.progress, c.name as company_name,
                rstat.name as status_name, u.username
             FROM reports r
             LEFT JOIN report_syncs rs ON r.id = rs.report_id
             LEFT JOIN companies c ON rs.company_id = c.id
             LEFT JOIN report_statuses rstat ON r.report_status_id = rstat.id
             LEFT JOIN users u ON r.user_id = u.id
             ORDER BY r.reported_at DESC`
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Erreur lecture reports:", error);
        res.status(500).json({ error: error.message });
    }
});

// ========================
// SYNC FIREBASE TO POSTGRES (Pour le Manager)
// ========================
app.post("/sync", authenticate, async (req, res) => {
    const client = await pool.connect();
    let syncCount = 0;

    try {
        await client.query("BEGIN");

        // 1️⃣ Récupérer uniquement les reports non synchronisés
        const snapshot = await db
            .collection("reports")
            .where("is_synced", "==", false)
            .get();

        for (const doc of snapshot.docs) {
            const data = doc.data();

            const postgresUserId = await syncUserToPostgres({
                email: `${data.user_id}@firebase.local`,
                displayName: data.user_id
            });


            // 3️⃣ Insérer le report dans PostgreSQL
            const result = await client.query(
                `INSERT INTO reports (
                    reported_at,
                    longitude,
                    latitude,
                    city,
                    is_synced,
                    report_status_id,
                    problem_type_id,
                    user_id,
                    firebase_id
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
                    data.id
                ]
            );

            const postgresReportId = result.rows[0].id;

            // 4️⃣ Mettre à jour Firestore (marqué comme synchronisé)
            await doc.ref.update({
                is_synced: true,
                postgres_report_id: postgresReportId
            });

            syncCount++;
        }

        await client.query("COMMIT");

        res.json({
            message: `${syncCount} signalements synchronisés`
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Erreur synchronisation:", error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});


// ========================
// START SERVER
// ========================
app.listen(3000, () => {
    console.log("API Firebase-PostgreSQL démarrée sur http://localhost:3000");
});
