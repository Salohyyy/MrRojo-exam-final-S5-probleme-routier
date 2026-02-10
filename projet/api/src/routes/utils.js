const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getReportStatuses,
  createReportStatus,
  updateReportStatus,
  deleteReportStatus,
  getProblemTypes,
  getRepairTypes
} = require('../controllers/utilsController');

// Routes Companies
/**
 * @swagger
 * /api/utils/companies:
 *   get:
 *     summary: Lister les entreprises
 *     tags: [Utils]
 *     security: []
 *     responses:
 *       200:
 *         description: Liste des entreprises
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: Entreprise ABC
 *                   address:
 *                     type: string
 *                     example: Antananarivo
 *       500:
 *         description: Erreur serveur
 */
router.get('/companies', getCompanies);

/**
 * @swagger
 * /api/utils/companies:
 *   post:
 *     summary: Créer une entreprise
 *     tags: [Utils]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Entreprise ABC
 *               address:
 *                 type: string
 *                 example: Antananarivo
 *     responses:
 *       201:
 *         description: Entreprise créée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 name:
 *                   type: string
 *                 address:
 *                   type: string
 *       400:
 *         description: Données invalides (name requis)
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       500:
 *         description: Erreur serveur
 */
router.post('/companies', verifyFirebaseToken, createCompany);

/**
 * @swagger
 * /api/utils/companies/{id}:
 *   put:
 *     summary: Mettre à jour une entreprise
 *     tags: [Utils]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'entreprise
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Entreprise ABC
 *               address:
 *                 type: string
 *                 example: Antananarivo
 *     responses:
 *       200:
 *         description: Entreprise mise à jour
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       404:
 *         description: Entreprise non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.put('/companies/:id', verifyFirebaseToken, updateCompany);

/**
 * @swagger
 * /api/utils/companies/{id}:
 *   delete:
 *     summary: Supprimer une entreprise
 *     tags: [Utils]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'entreprise
 *     responses:
 *       200:
 *         description: Entreprise supprimée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Entreprise supprimée avec succès
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       404:
 *         description: Entreprise non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.delete('/companies/:id', verifyFirebaseToken, deleteCompany);

// Routes Report Statuses
/**
 * @swagger
 * /api/utils/report-statuses:
 *   get:
 *     summary: Lister les statuts de report
 *     tags: [Utils]
 *     security: []
 *     responses:
 *       200:
 *         description: Liste des statuts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: En attente
 *                   level:
 *                     type: integer
 *                     example: 1
 *       500:
 *         description: Erreur serveur
 */
router.get('/report-statuses', getReportStatuses);

/**
 * @swagger
 * /api/utils/report-statuses:
 *   post:
 *     summary: Créer un statut de report
 *     tags: [Utils]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: En cours
 *               level:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       201:
 *         description: Statut créé
 *       400:
 *         description: Données invalides (name requis)
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       500:
 *         description: Erreur serveur
 */
router.post('/report-statuses', verifyFirebaseToken, createReportStatus);

/**
 * @swagger
 * /api/utils/report-statuses/{id}:
 *   put:
 *     summary: Mettre à jour un statut de report
 *     tags: [Utils]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du statut
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Terminé
 *               level:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Statut mis à jour
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       404:
 *         description: Statut non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put('/report-statuses/:id', verifyFirebaseToken, updateReportStatus);

/**
 * @swagger
 * /api/utils/report-statuses/{id}:
 *   delete:
 *     summary: Supprimer un statut de report
 *     tags: [Utils]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du statut
 *     responses:
 *       200:
 *         description: Statut supprimé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Statut supprimé avec succès
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       404:
 *         description: Statut non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete('/report-statuses/:id', verifyFirebaseToken, deleteReportStatus);

// Routes Problem Types
/**
 * @swagger
 * /api/utils/problem-types:
 *   get:
 *     summary: Lister les types de problèmes
 *     tags: [Utils]
 *     security: []
 *     responses:
 *       200:
 *         description: Liste des types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: Nid de poule
 *       500:
 *         description: Erreur serveur
 */
router.get('/problem-types', getProblemTypes);


router.get('/repair-types', verifyAnyToken, getRepairTypes);

module.exports = router;