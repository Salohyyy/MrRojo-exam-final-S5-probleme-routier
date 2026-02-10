const express = require('express');
const router = express.Router();
const {
  getReportSyncs,
  getReportStatuses,
  updateReportSyncStatus,
  syncAllToFirebase
} = require('../controllers/managerController');

/**
 * @swagger
 * /api/manager/report-syncs:
 *   get:
 *     summary: Lister les chantiers (report_syncs) avec détails
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des chantiers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sync_id:
 *                         type: integer
 *                         example: 1
 *                       report_id:
 *                         type: integer
 *                         example: 12
 *                       city:
 *                         type: string
 *                         example: Antananarivo
 *                       latitude:
 *                         type: number
 *                         example: -18.8792
 *                       longitude:
 *                         type: number
 *                         example: 47.5079
 *                       status:
 *                         type: string
 *                         example: En cours
 *                       budget:
 *                         type: number
 *                         nullable: true
 *                       progress:
 *                         type: number
 *                         nullable: true
 *                       surface:
 *                         type: number
 *                         nullable: true
 *                       company_name:
 *                         type: string
 *                         nullable: true
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       500:
 *         description: Erreur serveur
 */
router.get('/report-syncs', getReportSyncs);

/**
 * @swagger
 * /api/manager/report-syncs/{id}/status:
 *   put:
 *     summary: Mettre à jour le statut/progrès d'un chantier et synchroniser avec Firebase
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de report_syncs
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status_id:
 *                 type: integer
 *                 nullable: true
 *                 description: ID du statut (report_statuses) à appliquer sur le report
 *                 example: 2
 *               progress:
 *                 type: number
 *                 nullable: true
 *                 description: Progression du chantier (valeur libre selon ton modèle)
 *                 example: 50
 *     responses:
 *       200:
 *         description: Mise à jour effectuée et synchronisée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Mise à jour effectuée et synchronisée
 *                 data:
 *                   type: object
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       500:
 *         description: Erreur serveur
 */
router.put('/report-syncs/:id/status', updateReportSyncStatus);

/**
 * @swagger
 * /api/manager/report-statuses:
 *   get:
 *     summary: Lister les statuts disponibles (report_statuses)
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des statuts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       500:
 *         description: Erreur serveur
 */
router.get('/report-statuses', getReportStatuses);

/**
 * @swagger
 * /api/manager/sync-all-to-firebase:
 *   post:
 *     summary: Lancer une synchronisation complète PostgreSQL -> Firebase
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Synchronisation terminée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Synchronisation complète terminée (10 éléments traités).
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       500:
 *         description: Erreur serveur
 */
router.post('/sync-all-to-firebase', syncAllToFirebase);

module.exports = router;
