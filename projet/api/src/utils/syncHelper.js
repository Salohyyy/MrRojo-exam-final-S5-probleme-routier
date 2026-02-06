const { db } = require('../config/firebase');
const pool = require('../config/database');
const admin = require('firebase-admin');

async function syncUserToPostgres(firebaseUser) {
    try {
        const result = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [firebaseUser.email]
        );

        if (result.rows.length > 0) {
            return result.rows[0].id;
        }

        const insertResult = await pool.query(
            'INSERT INTO users (username, email, user_status_id) VALUES ($1, $2, $3) RETURNING id',
            [firebaseUser.displayName || firebaseUser.email, firebaseUser.email, 1]
        );

        return insertResult.rows[0].id;
    } catch (error) {
        console.error('Erreur sync utilisateur:', error);
        throw error;
    }
}

async function syncDownload(client) {
    let syncCount = 0;

    try {
        const snapshot = await db
            .collection('reports')
            .where('is_synced', '==', false)
            .get();

        for (const doc of snapshot.docs) {
            const data = doc.data();

            const postgresUserId = await syncUserToPostgres({
                email: `${data.user_id}@firebase.local`,
                displayName: data.user_id
            });

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

            await doc.ref.update({
                is_synced: true,
                postgres_report_id: postgresReportId
            });

            syncCount++;
        }

        return syncCount;
    } catch (error) {
        console.error('Erreur synchronisation download:', error);
        throw error;
    }
}

async function syncUpload(row, client) {
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

    await db.collection('reports_traites').add(firebaseData);

    await client.query(
        'UPDATE report_syncs SET sent_to_firebase = true WHERE report_id = $1',
        [row.id]
    );
}

module.exports = { syncUserToPostgres, syncDownload, syncUpload };