const User = require('../models/User');
const mongoose = require('mongoose');
const Notification = require('../models/Notification'); // Il faudra créer ce modèle
const handleError = (error, res) => {
  console.error('Error:', error);
  return res.status(500).json({
    success: false,
    message: 'An error occurred',
    error: error.message
  });
};
/**
 * @desc    Ajouter un nouveau contact
 * @route   POST /api/contacts
 * @access  Privé
 */
exports.addContact = async (req, res) => {
  try {
    const { email, name, labels } = req.body;
    const userId = req.user.id;

    // Validation des données
    if (!email || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'L\'email et le nom sont obligatoires'
      });
    }

    // Vérifier si le contact existe déjà dans la liste de l'utilisateur
    const user = await User.findOne({
      _id: userId,
      'contacts.email': email
    });

    if (user) {
      return res.status(400).json({
        status: 'error',
        message: 'Ce contact existe déjà dans votre liste'
      });
    }

    // Récupérer l'utilisateur actuel avec sa clé publique
    const currentUser = await User.findById(userId).select('publicKey email firstName lastName');
    if (!currentUser || !currentUser.publicKey) {
      return res.status(400).json({
        status: 'error',
        message: 'Vous devez générer vos clés avant d\'ajouter des contacts'
      });
    }

    // Vérifier si l'email correspond à un utilisateur enregistré
    const contactUser = await User.findOne({ email }).select('_id publicKey');
    const contactRef = contactUser ? contactUser._id : null;
    
    // MODIFICATION: Ne plus récupérer directement la clé publique
    // La clé publique sera partagée seulement après acceptation
    const contactPublicKey = null; // On initialise à null

    // Créer le nouvel objet contact
    const newContact = {
      contactRef,
      email,
      name,
      publicKey: contactPublicKey,
      labels: labels || [],
      keyShareStatus: contactUser ? 'pending' : 'not_applicable' // Statut du partage de clé
    };

    // Ajouter le contact à la liste de l'utilisateur
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $push: { contacts: newContact } },
      { new: true, runValidators: true }
    ).select('contacts');

    // Récupérer le dernier contact ajouté (pour obtenir son ID généré)
    const addedContact = updatedUser.contacts[updatedUser.contacts.length - 1];
    
    // Si le contact est un utilisateur enregistré, créer une demande de partage de clé
    if (contactUser) {
      // Vérifier si l'utilisateur actuel existe déjà dans les contacts de l'utilisateur cible
      const alreadyContact = await User.findOne({
        _id: contactUser._id,
        'contacts.email': currentUser.email
      });

      if (!alreadyContact) {
        // Créer une notification pour demander l'autorisation de partage de clé
        const notification = new Notification({
          recipient: contactUser._id,
          sender: userId,
          type: 'key_share_request',
          message: `${currentUser.firstName || ''} ${currentUser.lastName || ''} souhaite échanger des clés publiques pour une communication sécurisée`,
          data: {
            senderName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email,
            senderEmail: currentUser.email,
            contactId: addedContact._id // ID du contact dans la liste de l'utilisateur demandeur
          },
          isRead: false
        });
        
        await notification.save();
      }
    }
    
    // Formater la réponse pour correspondre à l'attente du frontend
    const formattedContact = {
      id: addedContact._id,
      email: addedContact.email,
      name: addedContact.name,
      labels: addedContact.labels,
      publicKey: addedContact.publicKey,
      isRegisteredUser: !!addedContact.contactRef,
      keyShareStatus: addedContact.keyShareStatus
    };

    res.status(201).json({
      status: 'success',
      message: contactUser ? 'Contact ajouté avec succès. Une demande de partage de clé a été envoyée.' : 'Contact ajouté avec succès.',
      data: {
        contact: formattedContact
      }
    });

  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Accepter ou refuser une demande de partage de clé
 * @route   POST /api/contacts/key-share-response
 * @access  Privé
 */
exports.respondToKeyShareRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId, accept } = req.body;

    // Validation
    if (!notificationId) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de notification manquant'
      });
    }

    // Récupérer la notification
    const notification = await Notification.findById(notificationId);
    if (!notification || notification.recipient.toString() !== userId) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification non trouvée ou non autorisée'
      });
    }

    if (notification.type !== 'key_share_request') {
      return res.status(400).json({
        status: 'error',
        message: 'Type de notification incorrect'
      });
    }

    // Récupérer l'utilisateur qui a envoyé la demande
    const sender = await User.findById(notification.sender);
    if (!sender) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur demandeur non trouvé'
      });
    }

    // Récupérer l'utilisateur actuel
    const currentUser = await User.findById(userId).select('publicKey email firstName lastName');
    if (!currentUser) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    // Le contact ID est stocké dans les données de la notification
    const senderContactId = notification.data.contactId;

    if (accept) {
      // Si l'utilisateur accepte, mettre à jour les clés publiques des deux côtés
      
      // 1. Mettre à jour la clé publique du contact chez le demandeur
      await User.findOneAndUpdate(
        { _id: notification.sender, 'contacts._id': senderContactId },
        { 
          $set: { 
            'contacts.$.publicKey': currentUser.publicKey,
            'contacts.$.keyShareStatus': 'accepted'
          } 
        }
      );

      // 2. Vérifier si le destinataire a déjà ce contact dans sa liste
      const existingContact = await User.findOne({
        _id: userId,
        'contacts.email': sender.email
      });

      if (existingContact) {
        // Mettre à jour le contact existant
        await User.findOneAndUpdate(
          { _id: userId, 'contacts.email': sender.email },
          { 
            $set: { 
              'contacts.$.publicKey': sender.publicKey,
              'contacts.$.keyShareStatus': 'accepted'
            } 
          }
        );
      } else {
        // Ajouter le contact avec sa clé publique
        const newContact = {
          contactRef: sender._id,
          email: sender.email,
          name: `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email,
          publicKey: sender.publicKey,
          labels: [],
          keyShareStatus: 'accepted'
        };
        
        await User.findByIdAndUpdate(
          userId,
          { $push: { contacts: newContact } }
        );
      }

      // Créer une notification pour informer l'expéditeur que sa demande a été acceptée
      const acceptNotification = new Notification({
        recipient: notification.sender,
        sender: userId,
        type: 'key_share_accepted',
        message: `${currentUser.firstName || ''} ${currentUser.lastName || ''} a accepté votre demande d'échange de clés publiques`,
        isRead: false
      });
      
      await acceptNotification.save();

    } else {
      // Si l'utilisateur refuse, mettre à jour le statut du contact
      await User.findOneAndUpdate(
        { _id: notification.sender, 'contacts._id': senderContactId },
        { $set: { 'contacts.$.keyShareStatus': 'rejected' } }
      );

      // Créer une notification pour informer l'expéditeur que sa demande a été refusée
      const rejectNotification = new Notification({
        recipient: notification.sender,
        sender: userId,
        type: 'key_share_rejected',
        message: `${currentUser.firstName || ''} ${currentUser.lastName || ''} a refusé votre demande d'échange de clés publiques`,
        isRead: false
      });
      
      await rejectNotification.save();
    }

    // Marquer la notification comme lue
    notification.isRead = true;
    notification.responseDate = Date.now();
    await notification.save();

    res.status(200).json({
      status: 'success',
      message: accept ? 'Demande acceptée, clés échangées avec succès' : 'Demande refusée'
    });

  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Envoyer une nouvelle demande de partage de clé
 * @route   POST /api/contacts/:id/request-key-share
 * @access  Privé
 */
exports.requestKeyShare = async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;

    // Vérifier que l'ID est valide
    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de contact invalide'
      });
    }

    // Récupérer le contact
    const user = await User.findOne({
      _id: userId,
      'contacts._id': contactId
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact non trouvé'
      });
    }

    const contact = user.contacts.find(c => c._id.toString() === contactId);
    
    if (!contact.contactRef) {
      return res.status(400).json({
        status: 'error',
        message: 'Ce contact n\'est pas un utilisateur enregistré'
      });
    }

    if (contact.keyShareStatus === 'accepted') {
      return res.status(400).json({
        status: 'error',
        message: 'Vous avez déjà échangé des clés avec ce contact'
      });
    }

    // Vérifier si une demande est déjà en cours
    const pendingRequest = await Notification.findOne({
      sender: userId,
      recipient: contact.contactRef,
      type: 'key_share_request',
      responseDate: { $exists: false }
    });

    if (pendingRequest) {
      return res.status(400).json({
        status: 'error',
        message: 'Une demande est déjà en cours pour ce contact'
      });
    }

    // Récupérer les infos de l'utilisateur actuel
    const currentUser = await User.findById(userId).select('email firstName lastName');

    // Créer une notification pour demander l'autorisation de partage de clé
    const notification = new Notification({
      recipient: contact.contactRef,
      sender: userId,
      type: 'key_share_request',
      message: `${currentUser.firstName || ''} ${currentUser.lastName || ''} souhaite échanger des clés publiques pour une communication sécurisée`,
      data: {
        senderName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email,
        senderEmail: currentUser.email,
        contactId: contactId
      },
      isRead: false
    });
    
    await notification.save();

    // Mettre à jour le statut du contact
    await User.findOneAndUpdate(
      { _id: userId, 'contacts._id': contactId },
      { $set: { 'contacts.$.keyShareStatus': 'pending' } }
    );

    res.status(200).json({
      status: 'success',
      message: 'Demande de partage de clé envoyée avec succès'
    });

  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Récupérer tous les contacts d'un utilisateur
 * @route   GET /api/contacts
 * @access  Privé
 */
exports.getContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Récupérer l'utilisateur avec ses contacts et les labels peuplés
    const user = await User.findById(userId)
      .select('contacts')
      .populate({
        path: 'contacts.labels',
        select: 'name color'
      })
      .populate({
        path: 'contacts.contactRef',
        select: 'firstName lastName profilePhoto status publicKey'
      });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    // Formater la réponse pour inclure les détails des utilisateurs enregistrés
    const formattedContacts = user.contacts.map(contact => {
      const contactData = {
        id: contact._id,
        email: contact.email,
        name: contact.name,
        labels: contact.labels,
        publicKey: contact.publicKey || (contact.contactRef ? contact.contactRef.publicKey : null),
        isRegisteredUser: !!contact.contactRef
      };

      // Si c'est un utilisateur enregistré, ajouter les détails supplémentaires
      if (contact.contactRef) {
        contactData.userDetails = {
          id: contact.contactRef._id,
          firstName: contact.contactRef.firstName,
          lastName: contact.contactRef.lastName,
          profilePhoto: contact.contactRef.profilePhoto,
          status: contact.contactRef.status,
          publicKey: contact.contactRef.publicKey
        };
      }

      return contactData;
    });

    res.status(200).json({
      status: 'success',
      results: formattedContacts.length,
      data: {
        contacts: formattedContacts
      }
    });

  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Récupérer un contact spécifique
 * @route   GET /api/contacts/:id
 * @access  Privé
 */
exports.getContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;

    // Vérifier que l'ID est valide
    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de contact invalide'
      });
    }

    // Trouver l'utilisateur avec le contact spécifique
    const user = await User.findOne(
      { _id: userId, 'contacts._id': contactId },
      { 'contacts.$': 1 }
    )
    .populate({
      path: 'contacts.labels',
      select: 'name color'
    })
    .populate({
      path: 'contacts.contactRef',
      select: 'firstName lastName profilePhoto status publicKey'
    });

    if (!user || !user.contacts || user.contacts.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact non trouvé'
      });
    }

    const contact = user.contacts[0];
    const responseData = {
      id: contact._id,
      email: contact.email,
      name: contact.name,
      labels: contact.labels,
      publicKey: contact.publicKey || (contact.contactRef ? contact.contactRef.publicKey : null),
      isRegisteredUser: !!contact.contactRef
    };

    if (contact.contactRef) {
      responseData.userDetails = {
        id: contact.contactRef._id,
        firstName: contact.contactRef.firstName,
        lastName: contact.contactRef.lastName,
        profilePhoto: contact.contactRef.profilePhoto,
        status: contact.contactRef.status,
        publicKey: contact.contactRef.publicKey
      };
    }

    res.status(200).json({
      status: 'success',
      data: {
        contact: responseData
      }
    });

  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Mettre à jour un contact
 * @route   PUT /api/contacts/:id
 * @access  Privé
 */
exports.updateContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    const { name, email, labels, publicKey } = req.body;

    // Vérifier que l'ID est valide
    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de contact invalide'
      });
    }

    // Récupérer l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: "Utilisateur non trouvé"
      });
    }

    // Vérifier si un autre contact a déjà cet email
    if (email) {
      const existingContact = user.contacts.find(
        (contact) =>
          contact.email === email && contact._id.toString() !== contactId
      );

      if (existingContact) {
        return res.status(400).json({
          status: 'error',
          message: 'Un contact avec cet email existe déjà'
        });
      }
    }

    // Construire l'objet de mise à jour
    const updateFields = {};
    if (name) updateFields['contacts.$.name'] = name;
    if (email) updateFields['contacts.$.email'] = email;
    if (labels) updateFields['contacts.$.labels'] = labels;
    if (publicKey) updateFields['contacts.$.publicKey'] = publicKey;

    // Mettre à jour le contact
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, 'contacts._id': contactId },
      { $set: updateFields },
      { new: true, runValidators: true }
    )
    .select('contacts')
    .populate({
      path: 'contacts.labels',
      select: 'name color'
    })
    .populate({
      path: 'contacts.contactRef',
      select: 'firstName lastName profilePhoto status publicKey'
    });

    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact non trouvé'
      });
    }

    // Trouver le contact mis à jour dans le tableau
    const updatedContact = updatedUser.contacts.find(
      (contact) => contact._id.toString() === contactId
    );

    // Formater le contact pour la réponse
    const formattedContact = {
      id: updatedContact._id,
      email: updatedContact.email,
      name: updatedContact.name,
      labels: updatedContact.labels,
      publicKey: updatedContact.publicKey || (updatedContact.contactRef ? updatedContact.contactRef.publicKey : null),
      isRegisteredUser: !!updatedContact.contactRef
    };

    if (updatedContact.contactRef) {
      formattedContact.userDetails = {
        id: updatedContact.contactRef._id,
        firstName: updatedContact.contactRef.firstName,
        lastName: updatedContact.contactRef.lastName,
        profilePhoto: updatedContact.contactRef.profilePhoto,
        status: updatedContact.contactRef.status,
        publicKey: updatedContact.contactRef.publicKey
      };
    }

    res.status(200).json({
      status: 'success',
      message: 'Contact mis à jour avec succès',
      data: {
        contact: formattedContact
      }
    });

  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Supprimer un contact
 * @route   DELETE /api/contacts/:id
 * @access  Privé
 */
exports.deleteContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;

    // Vérifier que l'ID est valide
    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de contact invalide'
      });
    }

    // Supprimer le contact
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { contacts: { _id: contactId } } },
      { new: true }
    ).select('contacts');

    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Contact supprimé avec succès',
      data: {
        contacts: updatedUser.contacts.map(contact => ({
          id: contact._id,
          email: contact.email,
          name: contact.name,
          labels: contact.labels,
          publicKey: contact.publicKey
        }))
      }
    });

  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Rechercher des contacts
 * @route   GET /api/contacts/search
 * @access  Privé
 */
exports.searchContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'La requête de recherche doit contenir au moins 2 caractères'
      });
    }

    // Recherche insensible à la casse avec regex
    const regex = new RegExp(query, 'i');

    const user = await User.findById(userId)
      .select('contacts')
      .populate({
        path: 'contacts.labels',
        select: 'name color'
      })
      .populate({
        path: 'contacts.contactRef',
        select: 'firstName lastName profilePhoto status publicKey'
      });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    // Filtrer les contacts selon la requête
    const filteredContacts = user.contacts.filter(contact => {
      return (
        regex.test(contact.name) ||
        regex.test(contact.email) ||
        (contact.contactRef && (
          regex.test(contact.contactRef.firstName) ||
          regex.test(contact.contactRef.lastName)
        ))
      );
    });

    // Formater la réponse
    const formattedContacts = filteredContacts.map(contact => {
      const contactData = {
        id: contact._id,
        email: contact.email,
        name: contact.name,
        labels: contact.labels,
        publicKey: contact.publicKey || (contact.contactRef ? contact.contactRef.publicKey : null),
        isRegisteredUser: !!contact.contactRef
      };

      if (contact.contactRef) {
        contactData.userDetails = {
          id: contact.contactRef._id,
          firstName: contact.contactRef.firstName,
          lastName: contact.contactRef.lastName,
          profilePhoto: contact.contactRef.profilePhoto,
          status: contact.contactRef.status,
          publicKey: contact.contactRef.publicKey
        };
      }

      return contactData;
    });

    res.status(200).json({
      status: 'success',
      results: formattedContacts.length,
      data: {
        contacts: formattedContacts
      }
    });

  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Ajouter ou supprimer un label à un contact
 * @route   PATCH /api/contacts/:id/labels
 * @access  Privé
 */
exports.updateContactLabels = async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    const { labelId, action } = req.body;

    // Validation
    if (!mongoose.Types.ObjectId.isValid(contactId) || !mongoose.Types.ObjectId.isValid(labelId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de contact ou de label invalide'
      });
    }

    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({
        status: 'error',
        message: 'Action invalide. Doit être "add" ou "remove"'
      });
    }

    // Construire l'opération de mise à jour
    const updateOperation = action === 'add' 
      ? { $addToSet: { 'contacts.$.labels': labelId } }
      : { $pull: { 'contacts.$.labels': labelId } };

    // Mettre à jour le contact
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, 'contacts._id': contactId },
      updateOperation,
      { new: true }
    )
    .select('contacts')
    .populate({
      path: 'contacts.labels',
      select: 'name color'
    })
    .populate({
      path: 'contacts.contactRef',
      select: 'firstName lastName profilePhoto status publicKey'
    });

    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact non trouvé'
      });
    }

    // Trouver le contact mis à jour
    const updatedContact = updatedUser.contacts.find(
      contact => contact._id.toString() === contactId
    );

    // Formater le contact pour la réponse
    const formattedContact = {
      id: updatedContact._id,
      email: updatedContact.email,
      name: updatedContact.name,
      labels: updatedContact.labels,
      publicKey: updatedContact.publicKey || (updatedContact.contactRef ? updatedContact.contactRef.publicKey : null),
      isRegisteredUser: !!updatedContact.contactRef
    };

    if (updatedContact.contactRef) {
      formattedContact.userDetails = {
        id: updatedContact.contactRef._id,
        firstName: updatedContact.contactRef.firstName,
        lastName: updatedContact.contactRef.lastName,
        profilePhoto: updatedContact.contactRef.profilePhoto,
        status: updatedContact.contactRef.status,
        publicKey: updatedContact.contactRef.publicKey
      };
    }

    res.status(200).json({
      status: 'success',
      message: `Label ${action === 'add' ? 'ajouté' : 'supprimé'} avec succès`,
      data: {
        contact: formattedContact
      }
    });

  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Mettre à jour la clé publique d'un contact
 * @route   PATCH /api/contacts/:id/public-key
 * @access  Privé
 */
exports.updateContactPublicKey = async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    const { publicKey } = req.body;

    // Validation
    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de contact invalide'
      });
    }

    if (!publicKey) {
      return res.status(400).json({
        status: 'error',
        message: 'La clé publique est requise'
      });
    }

    // Mettre à jour la clé publique du contact
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, 'contacts._id': contactId },
      { $set: { 'contacts.$.publicKey': publicKey } },
      { new: true }
    )
    .select('contacts')
    .populate({
      path: 'contacts.labels',
      select: 'name color'
    })
    .populate({
      path: 'contacts.contactRef',
      select: 'firstName lastName profilePhoto status'
    });

    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact non trouvé'
      });
    }

    // Trouver le contact mis à jour
    const updatedContact = updatedUser.contacts.find(
      contact => contact._id.toString() === contactId
    );

    // Formater le contact pour la réponse
    const formattedContact = {
      id: updatedContact._id,
      email: updatedContact.email,
      name: updatedContact.name,
      labels: updatedContact.labels,
      publicKey: updatedContact.publicKey,
      isRegisteredUser: !!updatedContact.contactRef
    };

    if (updatedContact.contactRef) {
      formattedContact.userDetails = {
        id: updatedContact.contactRef._id,
        firstName: updatedContact.contactRef.firstName,
        lastName: updatedContact.contactRef.lastName,
        profilePhoto: updatedContact.contactRef.profilePhoto,
        status: updatedContact.contactRef.status
      };
    }

    res.status(200).json({
      status: 'success',
      message: 'Clé publique mise à jour avec succès',
      data: {
        contact: formattedContact
      }
    });

  } catch (error) {
    handleError(error, res);
  }
};