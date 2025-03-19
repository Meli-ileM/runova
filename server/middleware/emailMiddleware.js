const { body, validationResult } = require('express-validator');

const emailMiddleware = {
  validateEmail: [
    // Validation du sujet
    body('subject')
      .if((value, { req }) => !req.body.isDraft) // Obligatoire sauf pour les brouillons
      .notEmpty().withMessage('Le sujet est requis')
      .isLength({ max: 200 }).withMessage('Le sujet ne doit pas dépasser 200 caractères'),
    
    // Validation du corps de l'email
    body('body')
      .if((value, { req }) => !req.body.isDraft) // Obligatoire sauf pour les brouillons
      .notEmpty().withMessage('Le corps de l\'email est requis'),
    
    // Validation des destinataires (to)
    body('to')
      .if((value, { req }) => !req.body.isDraft) // Obligatoire sauf pour les brouillons
      .isArray().withMessage('Les destinataires doivent être fournis sous forme de tableau')
      .notEmpty().withMessage('Au moins un destinataire est requis'),
    
    body('to.*.email')
      .if(body('to').exists())
      .isEmail().withMessage('Adresse email invalide'),
    
    // Validation des destinataires en copie (cc)
    body('cc')
      .optional()
      .isArray().withMessage('Les destinataires en copie doivent être fournis sous forme de tableau'),
    
    body('cc.*.email')
      .if(body('cc').exists())
      .isEmail().withMessage('Adresse email invalide'),
    
    // Validation des destinataires en copie cachée (bcc)
    body('bcc')
      .optional()
      .isArray().withMessage('Les destinataires en copie cachée doivent être fournis sous forme de tableau'),
    
    body('bcc.*.email')
      .if(body('bcc').exists())
      .isEmail().withMessage('Adresse email invalide'),
    
    // Validation du statut brouillon
    body('isDraft')
      .optional()
      .isBoolean().withMessage('Le statut brouillon doit être un booléen'),
    
    // Validation des pièces jointes
    body('attachments')
      .optional()
      .isArray().withMessage('Les pièces jointes doivent être fournies sous forme de tableau'),
    
    body('attachments.*.name')
      .if(body('attachments').exists())
      .notEmpty().withMessage('Le nom de la pièce jointe est requis'),
    
    body('attachments.*.url')
      .if(body('attachments').exists())
      .notEmpty().withMessage('L\'URL de la pièce jointe est requise'),
    
    // Middleware pour vérifier que l'email existe et appartient à l'utilisateur
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    }
  ],

  // Middleware pour vérifier les permissions sur un email
  checkEmailPermission: async (req, res, next) => {
    try {
      const Email = require('../models/Email');
      const email = await Email.findById(req.params.id);
      
      if (!email) {
        return res.status(404).json({ message: 'Email non trouvé' });
      }
      
      // Vérifier si l'utilisateur est l'expéditeur ou un destinataire
      const isSender = email.sender.userId.equals(req.user._id);
      const isRecipient = email.recipients.to.some(r => r.userId && r.userId.equals(req.user._id)) ||
                         email.recipients.cc.some(r => r.userId && r.userId.equals(req.user._id)) ||
                         email.recipients.bcc.some(r => r.userId && r.userId.equals(req.user._id));
      
      if (!isSender && !isRecipient) {
        return res.status(403).json({ message: 'Non autorisé à accéder à cet email' });
      }
      
      // Ajouter l'email et les flags de permission à la requête pour y accéder dans les contrôleurs
      req.email = email;
      req.isSender = isSender;
      req.isRecipient = isRecipient;
      
      next();
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la vérification des permissions', error: error.message });
    }
  },

  // Middleware pour vérifier que l'utilisateur est l'expéditeur
  isSender: async (req, res, next) => {
    try {
      const Email = require('../models/Email');
      const email = await Email.findById(req.params.id);
      
      if (!email) {
        return res.status(404).json({ message: 'Email non trouvé' });
      }
      
      if (!email.sender.userId.equals(req.user._id)) {
        return res.status(403).json({ message: 'Non autorisé. Vous n\'êtes pas l\'expéditeur de cet email' });
      }
      
      // Ajouter l'email à la requête pour y accéder dans les contrôleurs
      req.email = email;
      
      next();
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la vérification des permissions', error: error.message });
    }
  },

  // Middleware pour vérifier qu'un email est un brouillon
  isDraft: async (req, res, next) => {
    try {
      const Email = require('../models/Email');
      const email = await Email.findById(req.params.id);
      
      if (!email) {
        return res.status(404).json({ message: 'Email non trouvé' });
      }
      
      if (!email.isDraft) {
        return res.status(400).json({ message: 'Cet email n\'est pas un brouillon' });
      }
      
      // Ajouter l'email à la requête pour y accéder dans les contrôleurs
      req.email = email;
      
      next();
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la vérification du statut du brouillon', error: error.message });
    }
  },

  // Middleware pour vérifier qu'un email est dans la corbeille
  isInTrash: async (req, res, next) => {
    try {
      const Email = require('../models/Email');
      const email = await Email.findById(req.params.id);
      
      if (!email) {
        return res.status(404).json({ message: 'Email non trouvé' });
      }
      
      if (!email.isDeleted) {
        return res.status(400).json({ message: 'Cet email n\'est pas dans la corbeille' });
      }
      
      // Ajouter l'email à la requête pour y accéder dans les contrôleurs
      req.email = email;
      
      next();
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la vérification du statut de suppression', error: error.message });
    }
  },

  // Middleware pour valider les pièces jointes
  validateAttachments: [
    body('attachments')
      .optional()
      .isArray().withMessage('Les pièces jointes doivent être fournies sous forme de tableau'),
      
    body('attachments.*.name')
      .if(body('attachments').exists())
      .notEmpty().withMessage('Le nom de la pièce jointe est requis'),
      
    body('attachments.*.url')
      .if(body('attachments').exists())
      .notEmpty().withMessage('L\'URL de la pièce jointe est requise')
      .isURL().withMessage('L\'URL de la pièce jointe est invalide'),
      
    body('attachments.*.type')
      .optional()
      .isString().withMessage('Le type de la pièce jointe doit être une chaîne de caractères'),
      
    body('attachments.*.size')
      .optional()
      .isNumeric().withMessage('La taille de la pièce jointe doit être un nombre'),
      
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    }
  ],

  // Middleware pour valider les étiquettes
  validateLabels: [
    body('labels')
      .isArray().withMessage('Les étiquettes doivent être fournies sous forme de tableau')
      .notEmpty().withMessage('Au moins une étiquette doit être fournie'),
      
    body('labels.*')
      .isMongoId().withMessage('ID d\'étiquette invalide'),
      
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    }
  ],

  // Middleware pour valider l'ID du thread
  validateThreadId: [
    body('threadId')
      .optional()
      .isMongoId().withMessage('ID de thread invalide'),
      
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    }
  ],

  // Middleware pour vérifier si un thread existe
  threadExists: async (req, res, next) => {
    try {
      if (!req.body.threadId) {
        return next();
      }
      
      const Thread = require('../models/Thread');
      const thread = await Thread.findById(req.body.threadId);
      
      if (!thread) {
        return res.status(404).json({ message: 'Thread non trouvé' });
      }
      
      // Ajouter le thread à la requête pour y accéder dans les contrôleurs
      req.thread = thread;
      
      next();
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la vérification du thread', error: error.message });
    }
  },

  // Middleware pour limiter le nombre d'emails récupérés
  paginate: (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    // Limiter le nombre maximum d'emails par page à 50
    req.pagination = {
      page: page,
      limit: Math.min(limit, 50),
      skip: (page - 1) * Math.min(limit, 50)
    };
    
    next();
  },

  // Middleware pour valider les paramètres de recherche
  validateSearchParams: [
    body('q')
      .notEmpty().withMessage('Le terme de recherche est requis'),
      
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    }
  ],

  // Middleware pour valider le filtrage par dossier
  validateFolder: (req, res, next) => {
    const allowedFolders = ['inbox', 'sent', 'drafts', 'archived', 'important', 'trash', 'all'];
    const folder = req.query.folder;
    
    if (folder && !allowedFolders.includes(folder)) {
      return res.status(400).json({ message: 'Dossier invalide' });
    }
    
    next();
  },

  // Middleware pour gérer les erreurs
  errorHandler: (err, req, res, next) => {
    console.error('Erreur email:', err);
    
    // Gérer les erreurs de validation MongoDB
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => ({
        field: error.path,
        message: error.message
      }));
      
      return res.status(400).json({ errors });
    }
    
    // Gérer les erreurs de cast MongoDB (ID invalide)
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'ID invalide: ' + err.path });
    }
    
    // Erreur générique
    res.status(500).json({ message: 'Erreur interne du serveur', error: err.message });
  }
};

module.exports = emailMiddleware;