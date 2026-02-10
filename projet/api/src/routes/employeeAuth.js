const express = require('express');
const router = express.Router();
const { verifyEmployeeToken } = require('../middleware/auth');
const {
  loginEmployee,
  verifyEmployeeToken: verifyToken
} = require('../controllers/employeeAuthController');

/**
 * @swagger
 * /api/employee-auth/login:
 *   post:
 *     summary: Authentification des employés
 *     description: Endpoint de connexion pour les employés avec validation locale
 *     tags: [Employee Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Identifiants invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Identifiants invalides
 *       429:
 *         description: Trop de tentatives de connexion
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Trop de tentatives. Veuillez réessayer plus tard
 */
router.post('/login', loginEmployee);

/**
 * @swagger
 * /api/employee-auth/verify:
 *   get:
 *     summary: Vérification du token d'authentification
 *     description: Vérifie la validité du token JWT et retourne les informations de l'employé
 *     tags: [Employee Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token valide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/Employee'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/verify', verifyEmployeeToken, verifyToken);

module.exports = router;