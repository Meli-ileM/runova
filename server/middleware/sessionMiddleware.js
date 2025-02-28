
/**
 * Middleware pour vérifier et rafraîchir les données de session
 * Ce middleware peut être placé avant les routes qui nécessitent des données de session
 */
exports.checkSession = (req, res, next) => {
  // Si la session n'existe pas
  if (!req.session) {
    console.warn('Session non disponible');
    return res.status(500).json({
      status: 'error',
      message: 'Problème de session sur le serveur'
    });
  }
  
  // Vérifier si le mot de passe temporaire a expiré
  if (req.session.tempPassword && req.session.passwordExpiresAt) {
    if (Date.now() > req.session.passwordExpiresAt) {
      console.log('Mot de passe temporaire expiré pour l\'utilisateur:', req.user?.email);
      
      // Supprimer les données sensibles expirées
      delete req.session.tempPassword;
      delete req.session.passwordExpiresAt;
      
      return res.status(401).json({
        status: 'error',
        requiresReauthentication: true,
        message: 'Votre session de déchiffrement a expiré. Veuillez vous reconnecter.'
      });
    } else {
      // Rafraîchir la date d'expiration à chaque activité (optionnel)
      req.session.passwordExpiresAt = Date.now() + (60 * 60 * 1000); // 1 heure
    }
  }

  next();
};

/**
 * Middleware pour exiger une session active avec un mot de passe
 * Utilisé pour les routes qui nécessitent obligatoirement un mot de passe en session
 */
exports.requirePassword = (req, res, next) => {
  if (!req.session || !req.session.tempPassword) {
    return res.status(401).json({
      status: 'error',
      requiresReauthentication: true,
      message: 'Cette action nécessite une authentification récente. Veuillez vous reconnecter.'
    });
  }
  
  next();
};