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
      'SELECT is_blocked FROM user_auth_tracking WHERE uid = $1',
      [decodedToken.uid]
    );
    
    if (result.rows.length > 0 && result.rows[0].is_blocked) {
      return res.status(403).json({ 
        error: 'Compte bloqué',
        message: 'Votre compte a été bloqué. Contactez un administrateur.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Erreur vérification token:', error);
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

async function requireAdmin(req, res, next) {
  try {
    // Vérifier les custom claims pour le rôle admin
    const user = await auth.getUser(req.user.uid);
    
    if (user.customClaims && user.customClaims.admin === true) {
      next();
    } else {
      res.status(403).json({ error: 'Accès refusé - Admin requis' });
    }
  } catch (error) {
    console.error('Erreur vérification admin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  verifyFirebaseToken,
  requireAdmin
};