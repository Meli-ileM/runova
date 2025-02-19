const User = require('../models/User');
const Email = require('../models/Email');
const Thread = require('../models/Thread');
const twoFactorService = require('../utils/twoFactorService ');
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Gestion des erreurs
const handleError = (error, res) => {
  console.error('Erreur:', error);
  
  if (error.code === 11000) {
    // Erreur de duplication (email déjà utilisé)
    return res.status(400).json({ 
      status: 'error', 
      message: 'Cet email est déjà utilisé'
    });
  }
  
  // Erreurs de validation Mongoose
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({ 
      status: 'error', 
      message: messages.join(', ')
    });
  }
  
  return res.status(500).json({ 
    status: 'error', 
    message: 'Une erreur est survenue sur le serveur'
  });
};

// Gestion des uploads de photos
const uploadProfilePhoto = (file, userId) => {
  if (!file) return null;
  
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'profiles');
  
  // Création du répertoire s'il n'existe pas
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Génération d'un nom de fichier unique
  const fileExtension = path.extname(file.originalname);
  const fileName = `${userId}-${Date.now()}${fileExtension}`;
  const filePath = path.join(uploadsDir, fileName);
  
  // Écriture du fichier
  fs.writeFileSync(filePath, file.buffer);
  
  return fileName;
};

// Contrôleur d'inscription (Register)
// exports.register = async (req, res) => {
//   try {
//     const { email, password, nom, prenom, birthdate } = req.body;
    
//     // Vérification de l'email
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ 
//         status: 'error', 
//         message: 'Cet email est déjà utilisé'
//       });
//     }
    
//     // Création du nouvel utilisateur
//     const newUser = new User({
//       email,
//       password,
//       firstName: prenom || '',
//       lastName: nom || '',
//       birthDate: birthdate
//     });
    
//     // Traitement de la photo de profil si présente
//     if (req.file) {
//       const photoFileName = uploadProfilePhoto(req.file, newUser._id);
//       if (photoFileName) {
//         newUser.profilePhoto = photoFileName;
//       }
//     }
    
//     // Sauvegarde de l'utilisateur
//     await newUser.save();
    
//     // Création du token JWT
//     const token = jwt.sign(
//       { id: newUser._id, email: newUser.email },
//       process.env.JWT_SECRET,
//       { expiresIn: '1d' }
//     );
    
//     // Réponse de succès
//     res.status(201).json({
//       status: 'success',
//       message: 'Utilisateur créé avec succès',
//       token,
//       user: {
//         id: newUser._id,
//         email: newUser.email,
//         firstName: newUser.firstName,
//         lastName: newUser.lastName,
//         profilePhoto: newUser.profilePhoto
//       }
//     });
    
//   } catch (error) {
//     handleError(error, res);
//   }
// };


// exports.login = async (req, res) => {
//   try {
//     const { email, password, rememberMe } = req.body;
    
//     // 1. Vérifiez que l'utilisateur existe AVEC le mot de passe
//     const user = await User.findOne({ email }).select('+password');
//     if (!user) {
//       return res.status(401).json({ 
//         status: 'error',
//         message: 'Email ou mot de passe incorrect'
//       });
//     }

//     // 2. Vérifiez le mot de passe
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({
//         status: 'error',
//         message: 'Email ou mot de passe incorrect'
//       });
//     }

//     // 3. Générez le token CORRECTEMENT
//     const token = jwt.sign(
//       {
//         id: user._id,
//         email: user.email
//       },
//       process.env.JWT_SECRET, // NE PAS utiliser de fallback
//       { expiresIn: rememberMe ? '30d' : '1d' }
//     );


//     // 4. Renvoyez la réponse COMPLÈTE
//     res.status(200).json({
//       status: 'success',
//       token,
//       user: {
//         id: user._id,
//         email: user.email,
//         firstName: user.firstName,
//         lastName: user.lastName
//       }
//     });

//   } catch (error) {
//     console.error('Erreur de login:', error);
//     res.status(500).json({
//       status: 'error',
//       message: 'Erreur serveur'
//     });
//   }
// };

exports.register = async (req, res) => {
  try {
    const { email, password, nom, prenom, birthdate, enable2FA } = req.body;
    
    // Vérification de l'email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Cet email est déjà utilisé'
      });
    }
    
    // Création du nouvel utilisateur
    const newUser = new User({
      email,
      password,
      firstName: prenom || '',
      lastName: nom || '',
      birthDate: birthdate
    });
    
    // Traitement de la photo de profil si présente
    if (req.file) {
      const photoFileName = uploadProfilePhoto(req.file, newUser._id);
      if (photoFileName) {
        newUser.profilePhoto = photoFileName;
      }
    }
    
    // Si l'utilisateur choisit d'activer 2FA dès l'inscription
    let qrCode = null;
    if (enable2FA) {
      // Générer un secret temporaire pour 2FA
      const twoFactorData = await twoFactorService.generateSecret(email);
      newUser.twoFactorTempSecret = twoFactorData.secret;
      qrCode = twoFactorData.qrCode;
    }
    
    // Sauvegarde de l'utilisateur
    await newUser.save();
    
    // Création du token JWT
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Réponse de succès
    const response = {
      status: 'success',
      message: 'Utilisateur créé avec succès',
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        profilePhoto: newUser.profilePhoto
      }
    };

    // Ajouter le QR code à la réponse si 2FA est demandé
    if (enable2FA && qrCode) {
      response.twoFactorSetup = {
        qrCode,
        requiresVerification: true
      };
    }
    
    res.status(201).json(response);
    
  } catch (error) {
    handleError(error, res);
  }
};
exports.login = async (req, res) => {
  try {
    const { email, password, rememberMe, twoFactorToken } = req.body;
    
    // 1. Vérifiez que l'utilisateur existe AVEC le mot de passe
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Email ou mot de passe incorrect'
      });
    }

    // 2. Vérifiez le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Email ou mot de passe incorrect'
      });
    }

    // 3. Vérifier si l'authentification à deux facteurs est activée
    if (user.twoFactorEnabled) {
      // Si le token 2FA n'est pas fourni, demander à l'utilisateur de le fournir
      if (!twoFactorToken) {
        return res.status(200).json({
          status: 'pending_2fa',
          message: 'Veuillez fournir le code d\'authentification à deux facteurs',
          userId: user._id
        });
      }
      
      // Vérifier le token 2FA
      const isValid = twoFactorService.verifyToken(twoFactorToken, user.twoFactorSecret);
      if (!isValid) {
        return res.status(401).json({
          status: 'error',
          message: 'Code d\'authentification invalide'
        });
      }
    }

    // 4. Générez le token JWT
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: rememberMe ? '30d' : '1d' }
    );

    // Mettre à jour la date de dernière connexion
    user.lastLogin = new Date();
    await user.save();

    // 5. Renvoyez la réponse complète
    res.status(200).json({
      status: 'success',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });

  } catch (error) {
    console.error('Erreur de login:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur serveur'
    });
  }
};


// Contrôleur pour récupérer le profil utilisateur
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
    
  } catch (error) {
    handleError(error, res);
  }
};
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('firstName lastName email profilePhoto');
    
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      data: user // Retourne directement l'objet user
    });
    
  } catch (error) {
    handleError(error, res);
  }
};
// Dans usercontroller.js
exports.searchUsers = async (req, res) => {
  try {
    const query = req.query.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ message: "Le terme de recherche doit contenir au moins 2 caractères" });
    }

    // Recherche par email ou nom (ajustez selon votre modèle de données)
    const users = await User.find({
      $or: [
        { email: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } }
      ]
    }).select('_id firstName lastName email profile_photo');

    // Exclure l'utilisateur actuel des résultats
    const filteredUsers = users.filter(user => user._id.toString() !== req.user._id.toString());

    res.json(filteredUsers);
  } catch (error) {
    console.error("Erreur lors de la recherche d'utilisateurs:", error);
    res.status(500).json({ message: "Erreur lors de la recherche d'utilisateurs", error: error.message });
  }
};
// Contrôleur pour mettre à jour le profil utilisateur
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, birthDate,presenceStatus  } = req.body;
    
    // Récupération des données à mettre à jour
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (birthDate !== undefined) updateData.birthDate = birthDate;
 // ✅ CORRECTION: Validation du statut avant mise à jour
     if (presenceStatus !== undefined) {
      const validStatuses = ['active', 'away', 'busy', 'offline'];
      if (validStatuses.includes(presenceStatus)) {
        updateData.presenceStatus = presenceStatus;
      } else {
        return res.status(400).json({
          status: 'error',
          message: 'Statut de présence invalide. Les valeurs autorisées sont: active, away, busy, offline'
        });
      }
    }
    
    
    // Traitement de la photo de profil si présente
    if (req.file) {
      const photoFileName = uploadProfilePhoto(req.file, req.user.id);
      if (photoFileName) {
        updateData.profilePhoto = photoFileName;
      }
    }
    
    // Mise à jour de l'utilisateur
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Utilisateur non trouvé'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Profil mis à jour avec succès',
      data: {
        user: updatedUser
      }
    });
    
  } catch (error) {
    handleError(error, res);
  }
};

// Contrôleur pour modifier le mot de passe
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validation des entrées
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Le mot de passe actuel et le nouveau mot de passe sont requis'
      });
    }
    
    // Récupération de l'utilisateur avec le mot de passe
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Vérification du mot de passe actuel
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Mot de passe actuel incorrect'
      });
    }
    
    // Mise à jour du mot de passe
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Mot de passe mis à jour avec succès'
    });
    
  } catch (error) {
    handleError(error, res);
  }
};
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { password } = req.body;
    
    // 1. Vérifier que l'utilisateur existe
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Utilisateur non trouvé'
      });
    }

    // 2. Vérifier le mot de passe pour confirmer la suppression
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Mot de passe incorrect, suppression annulée'
      });
    }

    // 3. Générer un identifiant unique pour "anonymiser" l'adresse email dans les anciens enregistrements
    const anonymousEmailId = `deleted-${Date.now()}-${crypto.randomBytes(8).toString('hex')}@deleted.account`;
    
    // 4. Modifier l'expéditeur dans les emails envoyés
    await Email.updateMany(
      { 'sender.email': userEmail },
      { 
        $set: { 
          'sender.email': anonymousEmailId,
          'sender.name': 'Compte supprimé'
        }
      }
    );
    
    // 5. Modifier les destinataires dans les emails reçus
    // Pour les destinataires "to"
    await Email.updateMany(
      { 'recipients.to.email': userEmail },
      { 
        $set: { 
          'recipients.to.$.email': anonymousEmailId,
          'recipients.to.$.name': 'Compte supprimé'
        }
      }
    );
    
    // Pour les destinataires "cc"
    await Email.updateMany(
      { 'recipients.cc.email': userEmail },
      { 
        $set: { 
          'recipients.cc.$.email': anonymousEmailId,
          'recipients.cc.$.name': 'Compte supprimé'
        }
      }
    );
    
    // Pour les destinataires "bcc"
    await Email.updateMany(
      { 'recipients.bcc.email': userEmail },
      { 
        $set: { 
          'recipients.bcc.$.email': anonymousEmailId,
          'recipients.bcc.$.name': 'Compte supprimé'
        }
      }
    );
    
    // 6. Supprimer les entrées associées à cet utilisateur dans userEmailStatus
    const { encodeEmailKey } = require('../utils/emailKey');
    const emailKey = encodeEmailKey(userEmail);
    
    await Email.updateMany(
      { [`userEmailStatus.${emailKey}`]: { $exists: true } },
      { $unset: { [`userEmailStatus.${emailKey}`]: "" } }
    );
    
    // 7. Supprimer définitivement les brouillons
    await Email.deleteMany({
      'sender.email': anonymousEmailId,
      isDraft: true
    });
    
    // 8. Supprimer les threads qui n'ont plus d'emails associés
    const emails = await Email.find();
    const activeThreadIds = new Set(emails.map(email => email.threadId?.toString()).filter(Boolean));
    
    await Thread.deleteMany({
      _id: { $nin: Array.from(activeThreadIds) }
    });
    
    
     await Notification.deleteMany({ recipient: userId });
    
     await User.updateMany(
      { 'contacts.email': userEmail },
      {
        $set: {
          'contacts.$.name': 'Compte supprimé',
          'contacts.$.email': anonymousEmailId
        }
      }
    );
    // 9. Supprimer l'utilisateur
    await User.findByIdAndDelete(userId);
    
    // 10. Envoyer la réponse
    res.status(200).json({
      status: 'success',
      message: 'Votre compte a été supprimé avec succès.'
    });
    
  } catch (error) {
    handleError(error, res);
  }
};
exports.setup2FA = async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    // Générer un nouveau secret temporaire
    const { secret, qrCode } = await twoFactorService.generateSecret(user.email);

    // Sauvegarder le secret temporaire dans le compte utilisateur
    user.twoFactorTempSecret = secret;
    await user.save();

    // Envoyer le QR code au client
    res.status(200).json({
      status: 'success',
      data: {
        qrCode,
        secret // On peut aussi envoyer le secret en texte pour les utilisateurs qui ne peuvent pas scanner le QR code
      }
    });

  } catch (error) {
    handleError(error, res);
  }
};

// Fonction pour vérifier et activer le 2FA
exports.enable2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    // Récupérer l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier que l'utilisateur a un secret temporaire
    if (!user.twoFactorTempSecret) {
      return res.status(400).json({
        status: 'error',
        message: 'Vous devez d\'abord configurer l\'authentification à deux facteurs'
      });
    }

    // Vérifier le token
    const isValid = twoFactorService.verifyToken(token, user.twoFactorTempSecret);
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Code invalide. Veuillez réessayer.'
      });
    }

    // Activer le 2FA en déplaçant le secret temporaire vers le secret permanent
    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorEnabled = true;
    user.twoFactorTempSecret = null;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Authentification à deux facteurs activée avec succès'
    });

  } catch (error) {
    handleError(error, res);
  }
};

// Fonction pour désactiver le 2FA
exports.disable2FA = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    // Récupérer l'utilisateur avec le mot de passe
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Mot de passe incorrect'
      });
    }

    // Désactiver le 2FA
    user.twoFactorSecret = null;
    user.twoFactorEnabled = false;
    user.twoFactorTempSecret = null;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Authentification à deux facteurs désactivée avec succès'
    });

  } catch (error) {
    handleError(error, res);
  }
};

// Fonction pour vérifier un code 2FA lors de la connexion
exports.verify2FA = async (req, res) => {
  try {
    const { email, token } = req.body;

    // Trouver l'utilisateur par email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier que le 2FA est activé
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({
        status: 'error',
        message: 'L\'authentification à deux facteurs n\'est pas activée pour cet utilisateur'
      });
    }

    // Vérifier le token
    const isValid = twoFactorService.verifyToken(token, user.twoFactorSecret);
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Code d\'authentification invalide'
      });
    }

    // Générer un nouveau JWT
    const jwtToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Mettre à jour la date de dernière connexion
    user.lastLogin = new Date();
    await user.save();

    // Renvoyer le token JWT
    res.status(200).json({
      status: 'success',
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });

  } catch (error) {
    handleError(error, res);
  }
};

// ✅ Réinitialisation via 2FA uniquement (pas d'email/token)
exports.verify2FAForReset = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.twoFactorSecret) return res.status(404).json({ message: 'Utilisateur inconnu' });

    const isValid = twoFactorService.verifyToken(code, user.twoFactorSecret);
    if (!isValid) return res.status(401).json({ message: 'Code invalide' });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur verify2FAForReset:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// exports.resetPasswordVia2FA = async (req, res) => {
//   try {
//     const { email, newPassword, code } = req.body;
    
//     // Vérifier que tous les champs nécessaires sont fournis
//     if (!email || !newPassword || !code) {
//       return res.status(400).json({ 
//         message: 'Tous les champs sont requis (email, nouveau mot de passe et code 2FA)' 
//       });
//     }
    
//     // Trouver l'utilisateur
//     const user = await User.findOne({ email }).select('+password');
//     if (!user || !user.twoFactorSecret) {
//       return res.status(404).json({ message: 'Utilisateur inconnu ou 2FA non activé' });
//     }

//     // Vérifier le code 2FA
//     const isValid = twoFactorService.verifyToken(code, user.twoFactorSecret);
//     if (!isValid) {
//       return res.status(401).json({ message: 'Code d\'authentification invalide' });
//     }

//     // IMPORTANT: Ne pas hasher directement le mot de passe ici
//     // Laisser le middleware du modèle User s'en charger
//     user.password = newPassword;
//     await user.save();

//     res.status(200).json({ 
//       status: 'success',
//       message: 'Mot de passe mis à jour avec succès' 
//     });
//   } catch (err) {
//     console.error('Erreur resetPasswordVia2FA:', err);
//     res.status(500).json({ 
//       status: 'error',
//       message: 'Erreur serveur lors de la réinitialisation du mot de passe' 
//     });
//   }
// };
// Ajoutez ces nouvelles routes à votre contrôleur usercontroller.js

// Route pour vérifier si l'utilisateur a une clé privée
exports.checkPrivateKey = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Email requis' 
      });
    }

    const user = await User.findOne({ email }).select('encryptedPrivateKey');
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Utilisateur non trouvé' 
      });
    }

    res.status(200).json({
      status: 'success',
      hasPrivateKey: !!(user.encryptedPrivateKey)
    });

  } catch (err) {
    console.error('Erreur checkPrivateKey:', err);
    res.status(500).json({ 
      status: 'error',
      message: 'Erreur serveur' 
    });
  }
};

// Route pour récupérer la clé privée chiffrée (pour rechiffrement côté client)
exports.getPrivateKey = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Email requis' 
      });
    }

    const user = await User.findOne({ email }).select('encryptedPrivateKey');
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Utilisateur non trouvé' 
      });
    }

    if (!user.encryptedPrivateKey) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Aucune clé privée trouvée' 
      });
    }

    res.status(200).json({
      status: 'success',
      encryptedPrivateKey: user.encryptedPrivateKey
    });

  } catch (err) {
    console.error('Erreur getPrivateKey:', err);
    res.status(500).json({ 
      status: 'error',
      message: 'Erreur serveur' 
    });
  }
};

// Version corrigée de resetPasswordVia2FA
exports.resetPasswordVia2FA = async (req, res) => {
  try {
    const { email, newPassword, code, newEncryptedPrivateKey } = req.body;
    
    // Vérifier que tous les champs nécessaires sont fournis
    if (!email || !newPassword || !code) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Tous les champs sont requis (email, nouveau mot de passe et code 2FA)' 
      });
    }
    
    // Trouver l'utilisateur avec sa clé privée chiffrée
    const user = await User.findOne({ email }).select('+password +encryptedPrivateKey');
    if (!user || !user.twoFactorSecret) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Utilisateur inconnu ou 2FA non activé' 
      });
    }

    // Vérifier le code 2FA
    const isValid = twoFactorService.verifyToken(code, user.twoFactorSecret);
    if (!isValid) {
      return res.status(401).json({ 
        status: 'error',
        message: 'Code d\'authentification invalide' 
      });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;

    // Si une nouvelle clé privée chiffrée a été fournie, la mettre à jour
    if (newEncryptedPrivateKey) {
      user.encryptedPrivateKey = newEncryptedPrivateKey;
      console.log('Clé privée mise à jour avec succès');
    } else if (user.encryptedPrivateKey) {
      console.warn('Attention: Changement de mot de passe sans re-chiffrement de la clé privée');
    }

    await user.save();

    res.status(200).json({ 
      status: 'success',
      message: 'Mot de passe mis à jour avec succès' 
    });
  } catch (err) {
    console.error('Erreur resetPasswordVia2FA:', err);
    res.status(500).json({ 
      status: 'error',
      message: 'Erreur serveur lors de la réinitialisation du mot de passe' 
    });
  }
};
