const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware d'authentification
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Vérifier si le token est présent dans les headers
    if (
      req.headers.authorization && 
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      // Alternative: récupérer le token depuis les cookies
      token = req.cookies.jwt;
    }
    
    // Vérifier si le token existe
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Vous n\'êtes pas connecté. Veuillez vous connecter pour accéder à cette ressource.'
      });
    }
    
    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier si l'utilisateur existe toujours
    const currentUser = await User.findById(decoded.id).select('-password');
    if (!currentUser) {
      return res.status(401).json({
        status: 'error',
        message: 'L\'utilisateur lié à ce token n\'existe plus.'
      });
    }
    
    // Vérifier si l'utilisateur est actif
    if (currentUser.status !== 'active') {
      return res.status(401).json({
        status: 'error',
        message: 'Ce compte a été désactivé ou suspendu.'
      });
    }
    
    // Ajouter l'utilisateur à la requête
    req.user = currentUser;
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token invalide. Veuillez vous reconnecter.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Votre session a expiré. Veuillez vous reconnecter.'
      });
    }
    
    console.error('Erreur d\'authentification:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Une erreur est survenue lors de la vérification de l\'authentification.'
    });
  }
};

// Middleware pour vérifier si l'utilisateur est connecté sans bloquer l'accès
exports.isLoggedIn = async (req, res, next) => {
  try {
    let token;
    
    if (
      req.headers.authorization && 
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    
    if (!token) {
      return next();
    }
    
    // Vérifier le token silencieusement
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id).select('-password');
      
      if (currentUser && currentUser.status === 'active') {
        req.user = currentUser;
      }
    } catch (err) {
      // Ignorer les erreurs de token
    }
    
    next();
    
  } catch (error) {
    console.error('Erreur lors de la vérification du statut de connexion:', error);
    next();
  }
};
exports.setupDecryptionKey = (req, res, next) => {
  try {
    const { password } = req.body;
    const user = req.user;
    
    // Si l'utilisateur est connecté et a configuré ses clés
    if (user && user.keysGenerated && user.encryptedPrivateKey && password) {
      // Stocker le mot de passe en session pour déchiffrer les messages
      if (!req.session) {
        req.session = {};
      }
      
      // On stocke le mot de passe en session pour déchiffrer les emails plus tard
      req.session.decryptionPassword = password;
      
      // Pour plus de sécurité, on peut aussi déchiffrer la clé privée immédiatement
      // et stocker la clé privée déchiffrée en session plutôt que le mot de passe
      try {
        const { decryptPrivateKey } = require('../utils/cryptoService');
        const privateKey = decryptPrivateKey(user.encryptedPrivateKey, password);
        
        // Stocker la clé privée déchiffrée en session
        req.session.privateKey = privateKey;
        
        // Ne pas stocker le mot de passe (plus sécurisé)
        delete req.session.decryptionPassword;
      } catch (error) {
        console.error("Impossible de déchiffrer la clé privée", error);
        // Ne pas bloquer la connexion en cas d'erreur de déchiffrement
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};
