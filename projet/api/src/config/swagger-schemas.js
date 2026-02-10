/**
 * @swagger
 * components:
 *   schemas:
 *     Report:
 *       type: object
 *       required:
 *         - id_intervention
 *         - description
 *         - latitude
 *         - longitude
 *       properties:
 *         id:
 *           type: integer
 *           description: ID unique du rapport
 *         id_intervention:
 *           type: integer
 *           description: ID de l'intervention
 *         description:
 *           type: string
 *           description: Description du problème
 *         latitude:
 *           type: number
 *           format: double
 *           description: Latitude de la localisation
 *         longitude:
 *           type: number
 *           format: double
 *           description: Longitude de la localisation
 *         status:
 *           type: string
 *           enum: [pending, in_progress, resolved]
 *           description: Statut du rapport
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Date de création
 *     Employee:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: integer
 *           description: ID unique de l'employé
 *         email:
 *           type: string
 *           format: email
 *           description: Email de l'employé
 *         password:
 *           type: string
 *           description: Mot de passe (hashé)
 *         role:
 *           type: string
 *           enum: [admin, manager, employee]
 *           description: Rôle de l'employé
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email de l'employé
 *         password:
 *           type: string
 *           description: Mot de passe
 *     LoginResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: Token JWT d'authentification
 *         user:
 *           $ref: '#/components/schemas/Employee'
 *         message:
 *           type: string
 *           description: Message de statut
 *   responses:
 *     UnauthorizedError:
 *       description: Accès non autorisé
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               error:
 *                 type: string
 *                 example: Token invalide ou expiré
 *     NotFoundError:
 *       description: Ressource non trouvée
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               error:
 *                 type: string
 *                 example: Ressource non trouvée
 *     ValidationError:
 *       description: Erreur de validation
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               error:
 *                 type: string
 *                 example: Erreur de validation des données
 */