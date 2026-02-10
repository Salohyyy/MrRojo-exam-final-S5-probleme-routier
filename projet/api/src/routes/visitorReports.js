const express = require('express');
const router = express.Router();
const {
  getAllReports,
  getAllReportsFromPostgres,
  getReportById,
  getReportsByCity,
  getReportSyncs,
  getCombinedReports
} = require('../controllers/visitorReportsController');

/**
 * @swagger
 * /api/visitor/reports:
 *   get:
 *     summary: Récupérer tous les signalements (depuis Firebase: reports_traites)
 *     tags: [Visitor]
 *     security: []
 *     responses:
 *       200:
 *         description: Liste des signalements
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
 *                 count:
 *                   type: integer
 *                   example: 12
 *                 message:
 *                   type: string
 *                   example: Aucun signalement trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/', getAllReports);

/**
 * @swagger
 * /api/visitor/reports/postgres:
 *   get:
 *     summary: Récupérer tous les signalements (depuis PostgreSQL)
 *     tags: [Visitor]
 *     security: []
 *     responses:
 *       200:
 *         description: Liste des signalements
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
 *                 count:
 *                   type: integer
 *                   example: 12
 *       500:
 *         description: Erreur serveur
 */
router.get('/postgres', getAllReportsFromPostgres);

/**
 * @swagger
 * /api/visitor/reports/syncs:
 *   get:
 *     summary: Récupérer les synchronisations (report_syncs)
 *     tags: [Visitor]
 *     security: []
 *     responses:
 *       200:
 *         description: Liste des synchronisations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Erreur serveur
 */
router.get('/syncs', getReportSyncs);
router.get('/combined', getCombinedReports);
router.get('/:id', getReportById);

/**
 * @swagger
 * /api/visitor/reports/city/{city}:
 *   get:
 *     summary: Récupérer les signalements par ville
 *     tags: [Visitor]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom de la ville
 *         example: Antananarivo
 *     responses:
 *       200:
 *         description: Liste des signalements pour la ville
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
 *                 count:
 *                   type: integer
 *                   example: 3
 *       500:
 *         description: Erreur serveur
 */
router.get('/city/:city', getReportsByCity);

/**
 * @swagger
 * /api/visitor/reports/{id}:
 *   get:
 *     summary: Récupérer un signalement par ID
 *     tags: [Visitor]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du signalement (document Firebase)
 *         example: "12"
 *     responses:
 *       200:
 *         description: Signalement trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       404:
 *         description: Signalement non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', getReportById);

module.exports = router;
