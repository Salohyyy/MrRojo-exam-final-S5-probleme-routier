const { db } = require('../config/firebase');
const pool = require('../config/database');
const admin = require('firebase-admin');

/**
 * Synchroniser un utilisateur Firebase vers PostgreSQL
 */
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

/**
 * Télécharger les images d'un rapport depuis Firebase
 * @param {string} firebaseId - ID du rapport dans Firebase
 * @param {number} postgresReportId - ID du rapport dans PostgreSQL
 * @param {object} client - Client PostgreSQL pour la transaction
 * @returns {number} Nombre de photos téléchargées
 */
async function downloadReportPhotos(reportData, postgresReportId, client) {
    let photosCount = 0;
    
    try {
        //  Vérifier si le rapport a des photos
        const photos = reportData.photos;
        
        if (!photos || !Array.isArray(photos) || photos.length === 0) {
            return 0;
        }

        for (let i = 0; i < photos.length; i++) {
            const photoData = photos[i];
            
            // Vérifier si c'est une string base64
            if (typeof photoData !== 'string') {
                console.warn(`Photo ${i} n'est pas une string, ignorée`);
                continue;
            }
            
            try {
                // Générer un ID unique pour la photo
                const firebasePhotoId = `photo_${postgresReportId}_${i}_${Date.now()}`;
                
                //  Convertir base64 en buffer BYTEA si nécessaire
                // La string base64 commence par "data:image/jpeg;base64,"
                let base64Data = photoData;
                let mimeType = 'image/jpeg';
                
                // Extraire le mime type si présent
                if (photoData.startsWith('data:')) {
                    const matches = photoData.match(/^data:(image\/\w+);base64,/);
                    if (matches) {
                        mimeType = matches[1];
                        base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
                    }
                }
                
                // Convertir base64 en buffer pour BYTEA
                const buffer = Buffer.from(base64Data, 'base64');
                
                //  Insérer la photo dans PostgreSQL
                await client.query(
                    `INSERT INTO report_photos (
                        report_id, 
                        photo_data, 
                        photo_base64,
                        mime_type,
                        uploaded_at,
                        sent_to_firebase,
                        firebase_photo_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (firebase_photo_id) 
                    DO UPDATE SET 
                        photo_data = EXCLUDED.photo_data,
                        photo_base64 = EXCLUDED.photo_base64,
                        mime_type = EXCLUDED.mime_type
                    `,
                    [
                        postgresReportId,
                        buffer,                    // BYTEA
                        photoData,                 // Version base64 complète
                        mimeType,
                        new Date(),
                        false,                     // Pas encore envoyé à Firebase
                        firebasePhotoId
                    ]
                );

                photosCount++;
                console.log(`📸 Photo ${i} ajoutée pour le rapport ${postgresReportId}`);

            } catch (photoError) {
                console.error(`Erreur insertion photo ${i}:`, photoError);
                // Continuer avec les autres photos
            }
        }

        return photosCount;
        
    } catch (error) {
        console.error('Erreur traitement des photos:', error);
        return 0;  // Ne pas bloquer la synchronisation
    }
}

// Fonction pour vérifier si un rapport existe déjà
async function checkReportTraiteExists(originalFirebaseId) {
  const querySnapshot = await db.collection('reports_traites')
    .where('original_firebase_id', '==', originalFirebaseId)
    .limit(1)
    .get();
  return !querySnapshot.empty;
}

/**
 * Synchroniser un rapport traité depuis PostgreSQL vers Firebase (Upload)
 * Inclut les photos associées
 * @param {object} row - Ligne du rapport depuis PostgreSQL
 * @param {object} client - Client PostgreSQL pour la transaction
 */ 
async function syncUpload(row, client) {
    try {
        // Vérifier si le rapport traité existe déjà dans Firebase
        const alreadyExists = await checkReportTraiteExists(row.firebase_id);
        
        if (alreadyExists) {
            console.log(`⚠️  Rapport traité ${row.firebase_id} existe déjà dans Firebase - skip`);
            return;
        }
        
        // Récupérer les photos associées au rapport
        const photos = await getReportPhotosForFirebase(row.id, client);
        
        // Données du rapport pour Firebase (INCLUANT les photos)
        const firebaseData = {
            original_firebase_id: row.firebase_id,
            postgres_report_id: row.id,
            longitude: Number(row.longitude),
            latitude: Number(row.latitude),
            city: row.city,
            surface: row.surface ? Number(row.surface) : null,
            budget: row.budget ? Number(row.budget) : null,
            progress: row.progress ? Number(row.progress) : null,
            report_status_id: row.report_status_id,
            problem_type_id: row.problem_type_id,
            company_id: row.company_id || null,
            company_name: row.company_name || null,
            synced_at: admin.firestore.FieldValue.serverTimestamp(),
            photos: photos, // ✅ Photos directement dans le document
            photos_count: photos.length,
            // Informations supplémentaires
            problem_type_name: row.problem_type_name || null,
            status_name: row.status_name || null
        };

        // ✅ Ajouter le rapport traité à Firebase avec les photos incluses
        const reportRef = await db.collection('reports_traites').add(firebaseData);
        
        console.log(`📤 Rapport ${row.id} créé dans Firebase avec ID: ${reportRef.id} (${photos.length} photos)`);

        // ✅ Marquer le rapport et ses photos comme synchronisés
        await client.query(
            `UPDATE report_syncs 
             SET sent_to_firebase = true, photos_synced = true, synced_at = CURRENT_TIMESTAMP 
             WHERE report_id = $1`,
            [row.id]
        );
        
        // ✅ Marquer les photos comme synchronisées
        if (photos.length > 0) {
            await client.query(
                `UPDATE report_photos 
                 SET sent_to_firebase = true, firebase_photo_id = $1 
                 WHERE report_id = $2 AND sent_to_firebase = false`,
                [reportRef.id, row.id]
            );
        }

        console.log(`✅ Rapport ${row.id} complètement synchronisé vers Firebase`);
        
    } catch (error) {
        console.error('Erreur sync upload:', error);
        throw error;
    }
}


/**
 * Récupérer les photos d'un rapport pour Firebase
 * @param {number} reportId - ID du rapport dans PostgreSQL
 * @param {object} client - Client PostgreSQL pour la transaction
 * @returns {Promise<Array>} Tableau de photos au format Firebase
 */
async function getReportPhotosForFirebase(reportId, client) {
    try {
        const photosResult = await client.query(
            `SELECT 
                id, 
                photo_base64,
                mime_type,
                uploaded_at
             FROM report_photos 
             WHERE report_id = $1 AND sent_to_firebase = false
             ORDER BY uploaded_at ASC`,
            [reportId]
        );

        console.log(`📸 ${photosResult.rows.length} photos à inclure dans le rapport traité`);

        // Formater les photos comme dans Firebase (même format que les reports originaux)
        const photos = photosResult.rows.map(photo => {
            let photoBase64 = photo.photo_base64;
            
            // Nettoyer le base64 si nécessaire (enlever "data:image/jpeg;base64,")
            if (typeof photoBase64 === 'string' && photoBase64.includes('base64,')) {
                photoBase64 = photoBase64.split('base64,')[1];
            }
            
            // Retourner le base64 pur (sans prefix)
            return photoBase64;
        }).filter(photo => photo && typeof photo === 'string'); // Filtrer les valeurs nulles

        return photos;
        
    } catch (error) {
        console.error('Erreur récupération photos pour Firebase:', error);
        return []; // Retourner un tableau vide en cas d'erreur
    }
}


/**
 * Télécharger les images d'un rapport traité vers Firebase
 * @param {number} reportId - ID du rapport dans PostgreSQL
 * @param {object} client - Client PostgreSQL pour la transaction
 */
async function uploadReportPhotosToFirebase(reportId, client) {
    try { 
        const photosResult = await client.query(
            `SELECT 
                id, 
                photo_base64, 
                uploaded_at,
                mime_type,
                firebase_photo_id
             FROM report_photos 
             WHERE report_id = $1 AND sent_to_firebase = false`,
            [reportId]
        );

        console.log(`${photosResult.rows.length} photos à synchroniser vers Firebase`);

        for (const photo of photosResult.rows) {
            try {
                
                //  NOUVEAU: Ajouter la photo à Firebase
                const photoData = {
                    report_id: reportId,
                    photo_base64: photo.photo_base64,
                    mime_type: photo.mime_type || 'image/jpeg',
                    uploaded_at: admin.firestore.FieldValue.serverTimestamp(),
                    synced_from_postgres: true,
                    original_postgres_id: photo.id
                };

                // Ajouter à la collection reports_traites_photos
                const photoRef = await db
                    .collection('reports_traites_photos')
                    .add(photoData);

                // c Mettre à jour le firebase_photo_id et marquer comme synchronisé
                await client.query(
                    'UPDATE report_photos SET firebase_photo_id = $1, sent_to_firebase = true WHERE id = $2',
                    [photoRef.id, photo.id]
                );

                console.log(` Photo ${photo.id} synchronisée vers Firebase (ID: ${photoRef.id})`);
                
            } catch (photoError) {
                console.error(` Erreur synchronisation photo ${photo.id}:`, photoError); 
            }
        }
        
        // Marquer le rapport comme ayant ses photos synchronisées
        await client.query(
            'UPDATE reports SET photos_synced = true WHERE id = $1',
            [reportId]
        );
        
    } catch (error) {
        console.error('Erreur upload photos vers Firebase:', error);
        throw error;
    }
}

/**
 * Synchroniser un rapport traité depuis PostgreSQL vers Firebase (Upload)
 * Inclut les photos associées
 * @param {object} row - Ligne du rapport depuis PostgreSQL
 * @param {object} client - Client PostgreSQL pour la transaction
 */
async function syncUpload(row, client) {
    try {
        //  Données du rapport pour Firebase
        const firebaseData = {
            original_firebase_id: row.firebase_id,
            postgres_report_id: row.id,
            longitude: Number(row.longitude),
            latitude: Number(row.latitude),
            city: row.city,
            surface: row.surface ? Number(row.surface) : null,
            budget: row.budget ? Number(row.budget) : null,
            progress: row.progress ? Number(row.progress) : null,
            report_status_id: row.report_status_id,
            problem_type_id: row.problem_type_id,
            company_id: row.company_id || null,
            company_name: row.company_name || null,
            synced_at: admin.firestore.FieldValue.serverTimestamp()
        };

        //  Ajouter le rapport traité à Firebase
        const reportRef = await db.collection('reports_traites').add(firebaseData);

        //  NOUVEAU: Synchroniser les photos associées
        try {
            await uploadReportPhotosToFirebase(row.id, client);
        } catch (photoError) {
            console.error('Erreur sync photos:', photoError);
            // Continuer même si les photos échouent
        }

        //  Marquer le rapport comme envoyé à Firebase
        await client.query(
            'UPDATE report_syncs SET sent_to_firebase = true WHERE report_id = $1',
            [row.id]
        );

        console.log(` Rapport ${row.id} synchronisé vers Firebase avec photos`);
    } catch (error) {
        console.error('Erreur sync upload:', error);
        throw error;
    }
}

/**
 * Synchroniser les rapports depuis Firebase vers PostgreSQL (Download)
 * Inclut les photos associées à chaque rapport
 * @param {object} client - Client PostgreSQL pour la transaction
 * @returns {object} { count: nombre de rapports, photosCount: nombre de photos }
 */
/**
 * Synchroniser les rapports depuis Firebase vers PostgreSQL (Download)
 * Inclut les photos associées à chaque rapport
 * @param {object} client - Client PostgreSQL pour la transaction
 * @returns {object} { count: nombre de rapports, photosCount: nombre de photos }
 */
async function syncDownload(client) {
    let syncCount = 0;
    let totalPhotosCount = 0;

    try {
        //  Récupérer tous les rapports depuis Firebase
        const snapshot = await db.collection('reports').get();

        console.log(`Synchronisation download: ${snapshot.docs.length} rapports à traiter`);

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const firebaseId = doc.id;
            
            try {
                //  1. Créer ou récupérer l'utilisateur dans PostgreSQL
                // Dans votre Firebase, user_id semble être un UID Firebase, pas un email
                // On va créer un utilisateur avec cet UID comme username
                const firebaseUserId = data.user_id || `firebase_user_${firebaseId}`;
                
                // Insérer dans la table users si nécessaire
                const userResult = await client.query(
                    `INSERT INTO users (username, email, user_status_id)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (email) 
                     DO UPDATE SET username = EXCLUDED.username
                     RETURNING id`,
                    [
                        firebaseUserId,
                        `${firebaseUserId}@firebase.local`,  // Email fictif
                        1  // user_status_id = 'active'
                    ]
                );
                
                const postgresUserId = userResult.rows[0].id;

                //  2. UPSERT du rapport principal
                const reportResult = await client.query(
                    `INSERT INTO reports (
                        reported_at, longitude, latitude, city, is_synced,
                        report_status_id, problem_type_id, user_id, firebase_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (firebase_id) 
                    DO UPDATE SET 
                        longitude = EXCLUDED.longitude,
                        latitude = EXCLUDED.latitude,
                        city = EXCLUDED.city,
                        report_status_id = EXCLUDED.report_status_id,
                        problem_type_id = EXCLUDED.problem_type_id,
                        is_synced = true
                    RETURNING id`,
                    [
                        data.reported_at?.toDate() || new Date(),
                        data.longitude ? Number(data.longitude) : null,
                        data.latitude ? Number(data.latitude) : null,
                        data.city || 'Inconnu',
                        true,  // Marquer comme synchronisé
                        data.report_status_id || 1,  // Default: Nouveau
                        data.problem_type_id || 1,   // Default: Nid de poule
                        postgresUserId,
                        firebaseId
                    ]
                );

                const postgresReportId = reportResult.rows[0].id;

                //  3. Télécharger les photos associées (depuis le champ "photos")
                const photosCount = await downloadReportPhotos(
                    data,
                    postgresReportId,
                    client
                );

                totalPhotosCount += photosCount;

                //  4. Mettre à jour le champ photos_synced dans reports
                if (photosCount > 0) {
                    await client.query(
                        `UPDATE reports SET photos_synced = true WHERE id = $1`,
                        [postgresReportId]
                    );
                }

                //  5. Mettre à jour Firebase si nécessaire
                try {
                    await doc.ref.update({
                        is_synced: true,
                        postgres_report_id: postgresReportId,
                        synced_at: admin.firestore.FieldValue.serverTimestamp(),
                        photos_synced: photosCount > 0
                    });
                } catch (firebaseError) {
                    console.warn(`⚠️ Impossible de mettre à jour Firebase pour ${firebaseId}:`, firebaseError);
                }

                syncCount++;
                console.log(` Rapport ${firebaseId} synchronisé avec ${photosCount} photo(s)`);

            } catch (reportError) {
                console.error(`❌ Erreur synchronisation rapport ${firebaseId}:`, reportError);
                // Continuer avec les autres rapports
            }
        }

        console.log(` Synchronisation download complétée: ${syncCount} rapports, ${totalPhotosCount} photos`);
        return {
            count: syncCount,
            photosCount: totalPhotosCount
        };

    } catch (error) {
        console.error('Erreur synchronisation download:', error);
        throw error;
    }
}

module.exports = {
    syncUserToPostgres, 
    syncUpload,
    syncDownload,
    downloadReportPhotos,
    uploadReportPhotosToFirebase
};