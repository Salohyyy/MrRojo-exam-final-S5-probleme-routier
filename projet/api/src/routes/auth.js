const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const {
  checkLoginAttempts,
  recordFailedAttempt,
  recordSuccessfulLogin
} = require('../controllers/authController');

/**
 * @swagger
 * /api/auth/check-attempts:
 *   post:
 *     summary: Vérifier le nombre de tentatives de connexion
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email de l'utilisateur
 *     responses:
 *       200:
 *         description: Nombre de tentatives restantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 attempts:
 *                   type: integer
 *                   description: Nombre de tentatives échouées
 *                 maxAttempts:
 *                   type: integer
 *                   description: Nombre maximum de tentatives autorisées
 *                 remaining:
 *                   type: integer
 *                   description: Nombre de tentatives restantes
 */
router.post('/check-attempts', checkLoginAttempts);

/**
 * @swagger
 * /api/auth/failed-attempt:
 *   post:
 *     summary: Enregistrer une tentative de connexion échouée
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email de l'utilisateur
 *     responses:
 *       200:
 *         description: Tentative échouée enregistrée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tentative échouée enregistrée
 *                 attempts:
 *                   type: integer
 *                   description: Nombre total de tentatives échouées
 */
router.post('/failed-attempt', recordFailedAttempt);

/**
 * @swagger
 * /api/auth/successful-login:
 *   post:
 *     summary: Enregistrer une connexion réussie
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connexion réussie enregistrée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Connexion réussie enregistrée
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/successful-login', verifyFirebaseToken, recordSuccessfulLogin);

module.exports = router;