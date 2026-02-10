const pool = require('../config/database');

class ReportPhotosModel {
  /**
   * Ajouter une photo à un rapport
   */
  static async addPhoto(reportId, photoBase64, mimeType = 'image/jpeg') {
    try {
      const query = `
        INSERT INTO report_photos (report_id, photo_base64, mime_type)
        VALUES ($1, $2, $3)
        RETURNING id, report_id, mime_type, uploaded_at, sent_to_firebase
      `;

      const result = await pool.query(query, [reportId, photoBase64, mimeType]);
      return result.rows[0];
    } catch (error) {
      console.error('Erreur addPhoto:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les photos d'un rapport
   */
  static async getReportPhotos(reportId) {
    try {
      const query = `
        SELECT 
          id,
          report_id,
          photo_base64,
          mime_type,
          uploaded_at,
          sent_to_firebase,
          firebase_photo_id
        FROM report_photos
        WHERE report_id = $1
        ORDER BY uploaded_at ASC
      `;

      const result = await pool.query(query, [reportId]);
      return result.rows;
    } catch (error) {
      console.error('Erreur getReportPhotos:', error);
      throw error;
    }
  }

  /**
   * Récupérer une photo spécifique
   */
  static async getPhotoById(photoId) {
    try {
      const query = `
        SELECT 
          id,
          report_id,
          photo_base64,
          mime_type,
          uploaded_at,
          sent_to_firebase,
          firebase_photo_id
        FROM report_photos
        WHERE id = $1
      `;

      const result = await pool.query(query, [photoId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur getPhotoById:', error);
      throw error;
    }
  }

  /**
   * Supprimer une photo
   */
  static async deletePhoto(photoId) {
    try {
      const query = `
        DELETE FROM report_photos
        WHERE id = $1
        RETURNING id
      `;

      const result = await pool.query(query, [photoId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur deletePhoto:', error);
      throw error;
    }
  }

  /**
   * Supprimer toutes les photos d'un rapport
   */
  static async deleteReportPhotos(reportId) {
    try {
      const query = `
        DELETE FROM report_photos
        WHERE report_id = $1
        RETURNING id
      `;

      const result = await pool.query(query, [reportId]);
      return result.rows.length;
    } catch (error) {
      console.error('Erreur deleteReportPhotos:', error);
      throw error;
    }
  }

  /**
   * Marquer les photos comme synchronisées vers Firebase
   */
  static async markPhotosAsSent(photoIds) {
    try {
      if (!photoIds || photoIds.length === 0) {
        return [];
      }

      const query = `
        UPDATE report_photos
        SET sent_to_firebase = true
        WHERE id = ANY($1)
        RETURNING id, report_id, sent_to_firebase
      `;

      const result = await pool.query(query, [photoIds]);
      return result.rows;
    } catch (error) {
      console.error('Erreur markPhotosAsSent:', error);
      throw error;
    }
  }

  /**
   * Marquer les photos non synchronisées d'un rapport
   */
  static async getUnsyncedPhotos(reportId) {
    try {
      const query = `
        SELECT 
          id,
          report_id,
          photo_base64,
          mime_type,
          uploaded_at,
          firebase_photo_id
        FROM report_photos
        WHERE report_id = $1 AND sent_to_firebase = false
        ORDER BY uploaded_at ASC
      `;

      const result = await pool.query(query, [reportId]);
      return result.rows;
    } catch (error) {
      console.error('Erreur getUnsyncedPhotos:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les photos non synchronisées
   */
  static async getAllUnsyncedPhotos() {
    try {
      const query = `
        SELECT 
          rp.id,
          rp.report_id,
          rp.photo_base64,
          rp.mime_type,
          rp.uploaded_at,
          r.firebase_id as report_firebase_id
        FROM report_photos rp
        INNER JOIN reports r ON rp.report_id = r.id
        WHERE rp.sent_to_firebase = false
        ORDER BY rp.uploaded_at ASC
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Erreur getAllUnsyncedPhotos:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour l'ID Firebase d'une photo
   */
  static async updateFirebasePhotoId(photoId, firebasePhotoId) {
    try {
      const query = `
        UPDATE report_photos
        SET firebase_photo_id = $1, sent_to_firebase = true
        WHERE id = $2
        RETURNING id, firebase_photo_id, sent_to_firebase
      `;

      const result = await pool.query(query, [firebasePhotoId, photoId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur updateFirebasePhotoId:', error);
      throw error;
    }
  }

  /**
   * Compter les photos d'un rapport
   */
  static async countReportPhotos(reportId) {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM report_photos
        WHERE report_id = $1
      `;

      const result = await pool.query(query, [reportId]);
      return parseInt(result.rows[0].total);
    } catch (error) {
      console.error('Erreur countReportPhotos:', error);
      throw error;
    }
  }

  /**
   * Compter les photos synchronisées d'un rapport
   */
  static async countSyncedPhotos(reportId) {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM report_photos
        WHERE report_id = $1 AND sent_to_firebase = true
      `;

      const result = await pool.query(query, [reportId]);
      return parseInt(result.rows[0].total);
    } catch (error) {
      console.error('Erreur countSyncedPhotos:', error);
      throw error;
    }
  }
}

module.exports = ReportPhotosModel;