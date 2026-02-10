const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, verifyAnyToken } = require('../middleware/auth');
const {
  createReport,
  getAllReports,
  getReportById,
  updateReport,
  uploadReport,
  uploadAllReports,
  syncDownload,
  getReportSyncs,
  updateReportSyncStatus,
  addPhotosToReport,
  getReportPhotos,
  deleteReportPhoto,
  getSyncStatus  // Ajoutez cette ligne
} = require('../controllers/reportController');

/**
 * @swagger
 * /api/reports/create:
 *   post:
 *     summary: Créer un nouveau rapport de problème routier
 *     description: Crée un nouveau rapport via l'application mobile avec authentification Firebase
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_intervention
 *               - description
 *               - latitude
 *               - longitude
 *             properties:
 *               id_intervention:
 *                 type: integer
 *                 description: ID de l'intervention
 *               description:
 *                 type: string
 *                 description: Description détaillée du problème
 *               latitude:
 *                 type: number
 *                 format: double
 *                 description: Latitude GPS de la localisation
 *               longitude:
 *                 type: number
 *                 format: double
 *                 description: Longitude GPS de la localisation
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: URLs des photos associées
 *     responses:
 *       201:
 *         description: Rapport créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Rapport créé avec succès
 *                 report:
 *                   $ref: '#/components/schemas/Report'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/create', verifyFirebaseToken, createReport);

// Routes managers (employés OU utilisateurs Firebase)

/**
 * @swagger
 * /api/reports/syncs:
 *   get:
 *     summary: Obtenir la liste des synchronisations
 *     description: Récupère l'historique des synchronisations de rapports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des synchronisations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 syncs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       status:
 *                         type: string
 *                         enum: [pending, in_progress, completed, failed]
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/syncs', verifyAnyToken, getReportSyncs);

/**
 * @swagger
 * /api/reports/syncs/{id}/status:
 *   put:
 *     summary: Mettre à jour le statut d'une synchronisation
 *     description: Met à jour le statut d'une synchronisation de rapport
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la synchronisation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, failed]
 *                 description: Nouveau statut de la synchronisation
 *     responses:
 *       200:
 *         description: Statut mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Statut mis à jour
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/syncs/:id/status', verifyAnyToken, updateReportSyncStatus);

/**
 * @swagger
 * /api/reports/local:
 *   get:
 *     summary: Obtenir tous les rapports locaux
 *     description: Récupère la liste de tous les rapports stockés localement
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des rapports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reports:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/local', verifyAnyToken, getAllReports);

/**
 * @swagger
 * /api/reports/local/{id}:
 *   get:
 *     summary: Obtenir un rapport spécifique
 *     description: Récupère les détails d'un rapport par son ID
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du rapport
 *     responses:
 *       200:
 *         description: Détails du rapport
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Report'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/local/:id', verifyAnyToken, getReportById);

/**
 * @swagger
 * /api/reports/local/{id}:
 *   put:
 *     summary: Mettre à jour un rapport
 *     description: Met à jour les informations d'un rapport existant
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du rapport
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 description: Nouvelle description du problème
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, resolved]
 *                 description: Nouveau statut du rapport
 *     responses:
 *       200:
 *         description: Rapport mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Rapport mis à jour
 *                 report:
 *                   $ref: '#/components/schemas/Report'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/local/:id', verifyAnyToken, updateReport);

/**
 * @swagger
 * /api/reports/local/{id}/upload:
 *   post:
 *     summary: Téléverser un rapport spécifique
 *     description: Synchronise un rapport local avec le serveur central
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du rapport à téléverser
 *     responses:
 *       200:
 *         description: Rapport téléversé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Rapport téléversé avec succès
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/local/:id/upload', verifyAnyToken, uploadReport);

/**
 * @swagger
 * /api/reports/sync/upload:
 *   post:
 *     summary: Téléverser tous les rapports en attente
 *     description: Synchronise tous les rapports locaux non encore téléversés
 *     tags: [Reports]
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
 *                 message:
 *                   type: string
 *                   example: Synchronisation terminée
 *                 uploaded:
 *                   type: integer
 *                   description: Nombre de rapports téléversés
 *                 failed:
 *                   type: integer
 *                   description: Nombre de rapports échoués
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/sync/upload', verifyAnyToken, uploadAllReports);

/**
 * @swagger
 * /api/reports/sync/download:
 *   post:
 *     summary: Télécharger les rapports depuis le serveur central
 *     description: Synchronise les rapports depuis le serveur vers le client local
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Téléchargement terminé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Téléchargement terminé
 *                 downloaded:
 *                   type: integer
 *                   description: Nombre de rapports téléchargés
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/sync/download', verifyAnyToken, syncDownload);

/**
 * @swagger
 * /api/reports/sync/status:
 *   get:
 *     summary: Obtenir le statut de synchronisation
 *     description: Récupère le statut actuel de la synchronisation des rapports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statut de synchronisation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [idle, syncing, error]
 *                   description: Statut actuel de la synchronisation
 *                 lastSync:
 *                   type: string
 *                   format: date-time
 *                   description: Date de la dernière synchronisation
 *                 pendingCount:
 *                   type: integer
 *                   description: Nombre de rapports en attente de synchronisation
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/sync/status', verifyAnyToken, getSyncStatus);  //  Ajoutez cette ligne

// Routes pour les photos
router.get('/:reportId/photos', verifyAnyToken, getReportPhotos);
router.post('/:reportId/photos', verifyAnyToken, addPhotosToReport);  //  Ajoutez cette ligne
router.delete('/:reportId/photos/:photoId', verifyAnyToken, deleteReportPhoto);

module.exports = router;