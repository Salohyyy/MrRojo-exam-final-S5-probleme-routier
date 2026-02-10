const express = require('express');
const router = express.Router();
const { verifyEmployeeToken, requireAdmin } = require('../middleware/auth');
const {
  getSettings,
  updateSessionDuration,
  updateDefaultMaxAttempts,
  getAllFirebaseUsers,
  updateUserMaxAttempts,
  getBlockedUsers,
  unblockUser
} = require('../controllers/adminController');

router.use(verifyEmployeeToken);
router.use(requireAdmin);

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Récupérer les paramètres globaux (sécurité/session)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paramètres récupérés
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       403:
 *         description: Accès refusé (admin requis)
 *       500:
 *         description: Erreur serveur
 */
router.get('/settings', getSettings);

/**
 * @swagger
 * /api/admin/settings/session-duration:
 *   put:
 *     summary: Mettre à jour la durée de session
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [minutes]
 *             properties:
 *               minutes:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1440
 *                 description: Durée de session en minutes
 *                 example: 60
 *     responses:
 *       200:
 *         description: Durée de session mise à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 settings:
 *                   type: object
 *       400:
 *         description: Données invalides (minutes hors [1-1440])
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       403:
 *         description: Accès refusé (admin requis)
 *       500:
 *         description: Erreur serveur
 */
router.put('/settings/session-duration', updateSessionDuration);

/**
 * @swagger
 * /api/admin/settings/max-attempts:
 *   put:
 *     summary: Mettre à jour le nombre maximum de tentatives par défaut
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attempts]
 *             properties:
 *               attempts:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 description: Nombre maximum de tentatives autorisées (par défaut)
 *                 example: 5
 *     responses:
 *       200:
 *         description: Paramètre mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 settings:
 *                   type: object
 *       400:
 *         description: Données invalides (attempts hors [1-10])
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       403:
 *         description: Accès refusé (admin requis)
 *       500:
 *         description: Erreur serveur
 */
router.put('/settings/max-attempts', updateDefaultMaxAttempts);

/**
 * @swagger
 * /api/admin/firebase-users:
 *   get:
 *     summary: Lister les utilisateurs Firebase avec leurs paramètres
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 description: Structure dépend de Firebase + settings
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       403:
 *         description: Accès refusé (admin requis)
 *       500:
 *         description: Erreur serveur
 */
router.get('/firebase-users', getAllFirebaseUsers);

/**
 * @swagger
 * /api/admin/users/{uid}/max-attempts:
 *   put:
 *     summary: Définir un max de tentatives personnalisé pour un utilisateur
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: UID Firebase de l'utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               max_attempts:
 *                 type: integer
 *                 nullable: true
 *                 minimum: 1
 *                 maximum: 10
 *                 description: Max tentatives (1-10) ou null pour revenir au défaut
 *                 example: 3
 *     responses:
 *       200:
 *         description: Paramètre utilisateur mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 settings:
 *                   type: object
 *       400:
 *         description: Données invalides (max_attempts hors [1-10] et non null)
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       403:
 *         description: Accès refusé (admin requis)
 *       500:
 *         description: Erreur serveur
 */
router.put('/users/:uid/max-attempts', updateUserMaxAttempts);

/**
 * @swagger
 * /api/admin/users/blocked:
 *   get:
 *     summary: Lister les utilisateurs bloqués
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des utilisateurs bloqués
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       403:
 *         description: Accès refusé (admin requis)
 *       500:
 *         description: Erreur serveur
 */
router.get('/users/blocked', getBlockedUsers);

/**
 * @swagger
 * /api/admin/users/{uid}/unblock:
 *   post:
 *     summary: Débloquer un utilisateur
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: UID Firebase de l'utilisateur
 *     responses:
 *       200:
 *         description: Utilisateur débloqué
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 loginAttempts:
 *                   type: object
 *       401:
 *         description: Non authentifié (token manquant/invalide/expiré)
 *       403:
 *         description: Accès refusé (admin requis)
 *       500:
 *         description: Erreur serveur
 */
router.post('/users/:uid/unblock', unblockUser);

module.exports = router;