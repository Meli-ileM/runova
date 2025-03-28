// middleware/emailEncryptionMiddleware.js
const User = require('../models/User');
const { encryptForAllRecipients } = require('../utils/cryptoService');

/**
 * Middleware pour récupérer les clés publiques des destinataires et chiffrer le contenu de l'email
 */
const encryptEmailContent = async (req, res, next) => {
  try {
    // Ne pas chiffrer les brouillons
    if (req.body.isDraft) {
      return next();
    }
    
    const { recipients, body, subject } = req.body;
    
    // Si pas de corps de message, continuer sans chiffrement
    if (!body) {
      return next();
    }
    
    // Collecter tous les emails des destinataires
    const recipientEmails = [
      ...recipients.to.map(r => r.email),
      ...recipients.cc.map(r => r.email),
      ...recipients.bcc.map(r => r.email)
    ];
    
    // Ajouter l'expéditeur pour qu'il puisse aussi déchiffrer ses propres messages
    recipientEmails.push(req.user.email);
    
    // Récupérer tous les utilisateurs qui ont des clés publiques
    const users = await User.find({
      email: { $in: recipientEmails },
      publicKey: { $exists: true, $ne: null }
    }).select('email publicKey');
    
    // Si aucun utilisateur n'a de clé publique, continuer sans chiffrement
    if (!users.length) {
      // Ajouter un indicateur que le message n'est pas chiffré
      req.body.isEncrypted = false;
      return next();
    }
    
    // Créer un map des clés publiques par email
    const publicKeysMap = {};
    users.forEach(user => {
      publicKeysMap[user.email] = user.publicKey;
    });
    
    // Chiffrer le contenu pour chaque destinataire qui a une clé publique
    const encryptedBodyMap = encryptForAllRecipients(body, publicKeysMap);
    
    // Chiffrer le sujet également
    const encryptedSubjectMap = encryptForAllRecipients(subject, publicKeysMap);
    
    // Remplacer le contenu original par une référence aux contenus chiffrés
    req.body.originalBody = req.body.body;  // Garder une copie en clair pour la journalisation si nécessaire
    req.body.originalSubject = req.body.subject;
    
    // Stocker les versions chiffrées
    req.body.encryptedContent = {
      body: encryptedBodyMap,
      subject: encryptedSubjectMap
    };
    
    // Remplacer le corps par un message standard pour les clients qui ne supportent pas le déchiffrement
    req.body.body = "Ce message est chiffré. Veuillez utiliser un client compatible pour le déchiffrer.";
    
    // Ajouter un indicateur que le message est chiffré
    req.body.isEncrypted = true;
    
    next();
  } catch (error) {
    console.error('Erreur lors du chiffrement de l\'email:', error);
    // En cas d'erreur de chiffrement, continuer avec le message non chiffré
    req.body.isEncrypted = false;
    next();
  }
};

module.exports = {
  encryptEmailContent
};