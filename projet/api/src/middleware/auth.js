const { auth } = require('../config/firebase');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const firebaseSettings = require('../services/firebaseSettings');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function verifyEmployeeToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await pool.query(
      `SELECT e.id, e.username, e.email, r.name as role_name
       FROM employees e
       JOIN roles r ON e.role_id = r.id
       WHERE e.id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Employé non trouvé' });
    }

    req.employee = result.rows[0];
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token invalide' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré', tokenExpired: true });
    }
    console.error('Erreur vérification token employé:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function requireAdmin(req, res, next) {
  if (req.employee.role_name !== 'admin') {
    return res.status(403).json({
      error: 'Accès refusé',
      message: 'Accès administrateur requis'
    });
  }
  next();
}

async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;

    const attempts = await firebaseSettings.getLoginAttempts(decodedToken.uid);

    if (attempts.is_blocked) {
      return res.status(403).json({
        error: 'Compte bloqué',
        message: 'Votre compte a été bloqué.'
      });
    }

    next();

  } catch (error) {
    console.error('Erreur vérification token Firebase:', error);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Token expiré',
        tokenExpired: true
      });
    }

    res.status(401).json({ error: 'Token invalide' });
  }
}

module.exports = {
  verifyEmployeeToken,
  requireAdmin,
  verifyFirebaseToken
};