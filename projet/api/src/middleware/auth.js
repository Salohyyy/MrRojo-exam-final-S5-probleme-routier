const { auth } = require('../config/firebase');
const pool = require('../config/database');

async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Vérifier le token Firebase
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    
    // Vérifier si l'utilisateur est bloqué
    const result = await pool.query(
      'SELECT is_blocked FROM login_attempts WHERE firebase_uid = $1',
      [decodedToken.uid]
    );
    
    if (result.rows.length > 0 && result.rows[0].is_blocked) {
      return res.status(403).json({ 
        error: 'Compte bloqué',
        message: 'Votre compte a été bloqué. Contactez un administrateur.' 
      });
    }

    // Vérifier si la session est expirée
    const sessionCheck = await pool.query(
      `SELECT expires_at FROM active_sessions 
       WHERE firebase_uid = $1 AND is_active = TRUE 
       ORDER BY session_started_at DESC LIMIT 1`,
      [decodedToken.uid]
    );

    if (sessionCheck.rows.length > 0) {
      const expiresAt = new Date(sessionCheck.rows[0].expires_at);
      const now = new Date();

      if (now > expiresAt) {
        // Marquer la session comme inactive
        await pool.query(
          `UPDATE active_sessions 
           SET is_active = FALSE 
           WHERE firebase_uid = $1 AND is_active = TRUE`,
          [decodedToken.uid]
        );
        
        return res.status(401).json({ 
          error: 'Session expirée',
          message: 'Votre session a expiré. Veuillez vous reconnecter.',
          sessionExpired: true
        });
      }

      // Mettre à jour la dernière activité
      await pool.query(
        `UPDATE active_sessions 
         SET last_activity_at = CURRENT_TIMESTAMP 
         WHERE firebase_uid = $1 AND is_active = TRUE`,
        [decodedToken.uid]
      );
    }
    
    next();
  } catch (error) {
    console.error('Erreur vérification token:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Token expiré',
        message: 'Votre token Firebase a expiré. Veuillez vous reconnecter.',
        tokenExpired: true
      });
    }
    
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

// Vérifier si l'utilisateur est un employé admin
async function requireEmployee(req, res, next) {
  try {
    const uid = req.user.uid;
    
    // Vérifier dans la table employees
    const result = await pool.query(
      `SELECT e.id, e.role_id, r.name as role_name 
       FROM employees e
       JOIN roles r ON e.role_id = r.id
       WHERE e.firebase_uid = $1`,
      [uid]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Accès refusé',
        message: 'Vous devez être un employé pour accéder à cette ressource' 
      });
    }

    req.employee = result.rows[0];
    next();
  } catch (error) {
    console.error('Erreur vérification employé:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// Vérifier si l'utilisateur est admin
async function requireAdmin(req, res, next) {
  try {
    const uid = req.user.uid;
    
    // Vérifier dans la table employees avec rôle admin
    const result = await pool.query(
      `SELECT e.id, r.name as role_name 
       FROM employees e
       JOIN roles r ON e.role_id = r.id
       WHERE e.firebase_uid = $1 AND r.name = 'admin'`,
      [uid]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Accès refusé',
        message: 'Accès administrateur requis' 
      });
    }

    req.admin = result.rows[0];
    next();
  } catch (error) {
    console.error('Erreur vérification admin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  verifyFirebaseToken,
  requireEmployee,
  requireAdmin
};