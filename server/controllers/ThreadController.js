// threadController.js

const Thread = require('../models/Thread');
const Email = require('../models/Email');
const mongoose = require('mongoose');
const { encodeEmailKey, decodeEmailKey } = require('../utils/emailKey');

const { ObjectId } = mongoose.Types;

const threadController = {
  /**
   * Récupérer tous les threads de l'utilisateur
   * @route GET /api/threads
   */
  getThreads: async (req, res) => {
    try {
      const email = req.user.email;
      const emailKey = encodeEmailKey(email);
      const userId = req.user._id;
      const {
        folder = 'inbox',
        page = 1,
        limit = 20,
        search
      } = req.query;

      const skip = (page - 1) * parseInt(limit);
      
      // Base pipeline pour l'agrégation
      const pipeline = [];
      
      // Étape 1: Faire correspondre les threads auxquels l'utilisateur participe
      // Nous devons vérifier si l'utilisateur est un participant OU si son email est associé au thread
      let matchStage = {
        $match: {
          $or: [
            { participants: userId }, // Vérifier par ID utilisateur
            { [`userThreadStatus.${emailKey}`]: { $exists: true } } // Vérifier par email encodé
          ]
        }
      };
      
      // Filtrage spécifique par dossier utilisant userThreadStatus
      switch (folder.trim()) {
        case 'inbox':
          matchStage.$match[`userThreadStatus.${emailKey}.isDeleted`] = { $ne: false };
          matchStage.$match[`userThreadStatus.${emailKey}.isArchived`] = { $ne: true };
          break;
        case 'sent':
          matchStage.$match[`userThreadStatus.${emailKey}.isDeleted`] = { $ne: true };
          break;
        case 'archived':
          matchStage.$match[`userThreadStatus.${emailKey}.isArchived`] = true;
          matchStage.$match[`userThreadStatus.${emailKey}.isDeleted`] = { $ne: false };
          break;
        case 'important':
          matchStage.$match[`userThreadStatus.${emailKey}.isImportant`] = true;
          matchStage.$match[`userThreadStatus.${emailKey}.isDeleted`] = { $ne: false };
          break;
        case 'trash':
          matchStage.$match[`userThreadStatus.${emailKey}.isDeleted`] = true;
          break;
      }
      
      pipeline.push(matchStage);
      
      // Étape 2: Ajouter une vérification supplémentaire pour s'assurer que l'utilisateur
      // est bien impliqué dans le thread (il peut être destinataire même si son userId n'est pas dans participants)
      pipeline.push({
        $lookup: {
          from: 'emails',
          let: { threadId: '$_id' },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ['$threadId', '$$threadId'] },
                $or: [
                  { 'sender.email': email },
                  { 'recipients.to.email': email },
                  { 'recipients.cc.email': email },
                  { 'recipients.bcc.email': email }
                ]
              }
            },
            { $limit: 1 }
          ],
          as: 'userParticipationCheck'
        }
      });
      
      // Ne garder que les threads où l'utilisateur est impliqué
      pipeline.push({
        $match: {
          $or: [
            { participants: userId },
            { 'userParticipationCheck.0': { $exists: true } }
          ]
        }
      });
      
      // Étape 3: Récupérer le dernier email de chaque thread
      pipeline.push({
        $lookup: {
          from: 'emails',
          let: { threadId: '$_id' },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ['$threadId', '$$threadId'] },
                isDraft: false
              }
            },
            { $sort: { sentAt: -1 } },
            { $limit: 1 }
          ],
          as: 'previewEmail'
        }
      });
      
      // Étape 4: Déplier les emails pour avoir accès à leurs propriétés
      pipeline.push({ $unwind: { path: '$previewEmail', preserveNullAndEmptyArrays: true } });
      
      // Étape 5: Recherche textuelle si nécessaire
      if (search) {
        pipeline.push({
          $match: {
            $or: [
              { subject: { $regex: search, $options: 'i' } },
              { 'previewEmail.subject': { $regex: search, $options: 'i' } },
              { 'previewEmail.body': { $regex: search, $options: 'i' } }
            ]
          }
        });
      }
      
      // Étape 6: Compter les emails non lus dans chaque thread
      pipeline.push({
        $lookup: {
          from: 'emails',
          let: { threadId: '$_id' },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ['$threadId', '$$threadId'] },
                $or: [
                  { 'recipients.to.email': email },
                  { 'recipients.cc.email': email },
                  { 'recipients.bcc.email': email }
                ],
                [`userEmailStatus.${emailKey}.isRead`]: { $ne: true },
                [`userEmailStatus.${emailKey}.isDeleted`]: { $ne: true },
                isDraft: false
              }
            },
            { $count: 'count' }
          ],
          as: 'unreadStats'
        }
      });
      
      // Étape 7: Calculer le nombre d'emails non lus
      pipeline.push({
        $addFields: {
          unreadCount: {
            $cond: {
              if: { $gt: [{ $size: '$unreadStats' }, 0] },
              then: { $arrayElemAt: ['$unreadStats.count', 0] },
              else: 0
            }
          }
        }
      });
      
      // Étape 8: Tri par date du dernier message
      pipeline.push({ $sort: { lastMessageAt: -1 } });
      
      // Étape 9: Pagination
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: parseInt(limit) });
      
      // Exécuter la pipeline d'agrégation
      const threads = await Thread.aggregate(pipeline);
      
      // Compter le nombre total de threads pour la pagination
      const countPipeline = [...pipeline];
      countPipeline.splice(-2); // Retirer les étapes de pagination
      const totalThreads = await Thread.aggregate([
        ...countPipeline,
        { $count: 'total' }
      ]);
      
      const total = totalThreads.length > 0 ? totalThreads[0].total : 0;
      
      res.status(200).json({
        success: true,
        count: threads.length,
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        data: threads
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Marquer un thread entier comme important
   * @route PATCH /api/threads/:id/important
   */
  markThreadAsImportant: async (req, res) => {
    try {
      const { id } = req.params;
      const emailKey = encodeEmailKey(req.user.email);
      
      // Récupérer le thread
      const thread = await Thread.findById(id);
      if (!thread) {
        return res.status(404).json({ success: false, message: 'Thread non trouvé' });
      }
      
      // Mettre à jour le statut du thread
      if (!thread.userThreadStatus.has(emailKey)) {
        thread.userThreadStatus.set(emailKey, {});
      }
      thread.userThreadStatus.get(emailKey).isImportant = true;
      await thread.save();
      
      // Récupérer tous les emails du thread
      const emails = await Email.find({ threadId: id });
      
      // Mettre à jour le statut important pour chaque email
      for (const email of emails) {
        if (!email.userEmailStatus.has(emailKey)) {
          email.userEmailStatus.set(emailKey, {});
        }
        email.userEmailStatus.get(emailKey).isImportant = true;
        await email.save();
      }
      
      res.status(200).json({ success: true, message: 'Thread marqué comme important' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Marquer un thread entier comme important
   * @route PATCH /api/threads/:id/important
   */
  markThreadAsImportant: async (req, res) => {
    try {
      const { id } = req.params;
      const emailKey = encodeEmailKey(req.user.email);
      
      // Récupérer le thread
      const thread = await Thread.findById(id);
      if (!thread) {
        return res.status(404).json({ success: false, message: 'Thread non trouvé' });
      }
      
      // Mettre à jour le statut du thread
      if (!thread.userThreadStatus.has(emailKey)) {
        thread.userThreadStatus.set(emailKey, {});
      }
      thread.userThreadStatus.get(emailKey).isImportant = true;
      await thread.save();
      
      // Récupérer tous les emails du thread
      const emails = await Email.find({ threadId: id });
      
      // Mettre à jour le statut important pour chaque email
      for (const email of emails) {
        if (!email.userEmailStatus.has(emailKey)) {
          email.userEmailStatus.set(emailKey, {});
        }
        email.userEmailStatus.get(emailKey).isImportant = true;
        await email.save();
      }
      
      res.status(200).json({ success: true, message: 'Thread marqué comme important' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Enlever l'importance d'un thread entier
   * @route PATCH /api/threads/:id/unimportant
   */
  unmarkThreadAsImportant: async (req, res) => {
    try {
      const { id } = req.params;
      const emailKey = encodeEmailKey(req.user.email);
      
      // Récupérer le thread
      const thread = await Thread.findById(id);
      if (!thread) {
        return res.status(404).json({ success: false, message: 'Thread non trouvé' });
      }
      
      // Mettre à jour le statut du thread
      if (!thread.userThreadStatus.has(emailKey)) {
        thread.userThreadStatus.set(emailKey, {});
      }
      thread.userThreadStatus.get(emailKey).isImportant = false;
      await thread.save();
      
      // Récupérer tous les emails du thread
      const emails = await Email.find({ threadId: id });
      
      // Mettre à jour le statut important pour chaque email
      for (const email of emails) {
        if (!email.userEmailStatus.has(emailKey)) {
          email.userEmailStatus.set(emailKey, {});
        }
        email.userEmailStatus.get(emailKey).isImportant = false;
        await email.save();
      }
      
      res.status(200).json({ success: true, message: 'Importance retirée du thread' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Archiver un thread entier
   * @route PATCH /api/threads/:id/archive
   */
  archiveThread: async (req, res) => {
    try {
      const { id } = req.params;
      const emailKey = encodeEmailKey(req.user.email);
      
      // Récupérer le thread
      const thread = await Thread.findById(id);
      if (!thread) {
        return res.status(404).json({ success: false, message: 'Thread non trouvé' });
      }
      
      // Mettre à jour le statut du thread
      if (!thread.userThreadStatus.has(emailKey)) {
        thread.userThreadStatus.set(emailKey, {});
      }
      thread.userThreadStatus.get(emailKey).isArchived = true;
      await thread.save();
      
      // Récupérer tous les emails du thread
      const emails = await Email.find({ threadId: id });
      
      // Archiver chaque email
      for (const email of emails) {
        if (!email.userEmailStatus.has(emailKey)) {
          email.userEmailStatus.set(emailKey, {});
        }
        email.userEmailStatus.get(emailKey).isArchived = true;
        await email.save();
      }
      
      res.status(200).json({ success: true, message: 'Thread archivé' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Désarchiver un thread entier
   * @route PATCH /api/threads/:id/unarchive
   */
  unarchiveThread: async (req, res) => {
    try {
      const { id } = req.params;
      const emailKey = encodeEmailKey(req.user.email);
      
      // Récupérer le thread
      const thread = await Thread.findById(id);
      if (!thread) {
        return res.status(404).json({ success: false, message: 'Thread non trouvé' });
      }
      
      // Mettre à jour le statut du thread
      if (!thread.userThreadStatus.has(emailKey)) {
        thread.userThreadStatus.set(emailKey, {});
      }
      thread.userThreadStatus.get(emailKey).isArchived = false;
      await thread.save();
      
      // Récupérer tous les emails du thread
      const emails = await Email.find({ threadId: id });
      
      // Désarchiver chaque email
      for (const email of emails) {
        if (!email.userEmailStatus.has(emailKey)) {
          email.userEmailStatus.set(emailKey, {});
        }
        email.userEmailStatus.get(emailKey).isArchived = false;
        await email.save();
      }
      
      res.status(200).json({ success: true, message: 'Thread désarchivé' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Déplacer un thread entier vers la corbeille
   * @route PATCH /api/threads/:id/trash
   */
  moveThreadToTrash: async (req, res) => {
    try {
      const { id } = req.params;
      const emailKey = encodeEmailKey(req.user.email);
      
      // Récupérer le thread
      const thread = await Thread.findById(id);
      if (!thread) {
        return res.status(404).json({ success: false, message: 'Thread non trouvé' });
      }
      
      // Mettre à jour le statut du thread
      if (!thread.userThreadStatus.has(emailKey)) {
        thread.userThreadStatus.set(emailKey, {});
      }
      thread.userThreadStatus.get(emailKey).isDeleted = true;
      await thread.save();
      
      // Récupérer tous les emails du thread
      const emails = await Email.find({ threadId: id });
      
      // Marquer chaque email comme supprimé
      for (const email of emails) {
        if (!email.userEmailStatus.has(emailKey)) {
          email.userEmailStatus.set(emailKey, {});
        }
        email.userEmailStatus.get(emailKey).isDeleted = true;
        await email.save();
      }
      
      res.status(200).json({ success: true, message: 'Thread déplacé vers la corbeille' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Restaurer un thread entier de la corbeille
   * @route PATCH /api/threads/:id/restore
   */
  restoreThreadFromTrash: async (req, res) => {
    try {
      const { id } = req.params;
      const emailKey = encodeEmailKey(req.user.email);
      
      // Récupérer le thread
      const thread = await Thread.findById(id);
      if (!thread) {
        return res.status(404).json({ success: false, message: 'Thread non trouvé' });
      }
      
      // Mettre à jour le statut du thread
      if (!thread.userThreadStatus.has(emailKey)) {
        thread.userThreadStatus.set(emailKey, {});
      }
      thread.userThreadStatus.get(emailKey).isDeleted = false;
      await thread.save();
      
      // Récupérer tous les emails du thread
      const emails = await Email.find({ threadId: id });
      
      // Restaurer chaque email
      for (const email of emails) {
        if (!email.userEmailStatus.has(emailKey)) {
          email.userEmailStatus.set(emailKey, {});
        }
        email.userEmailStatus.get(emailKey).isDeleted = false;
        await email.save();
      }
      
      res.status(200).json({ success: true, message: 'Thread restauré de la corbeille' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Supprimer définitivement un thread
   * @route DELETE /api/threads/:id
   */
 /**
 * Supprimer définitivement un thread
 * @route DELETE /api/threads/:id
 */
permanentDeleteThread: async (req, res) => {
  try {
    const { id } = req.params;
    const emailKey = encodeEmailKey(req.user.email);
    const userEmail = req.user.email;
    
    // Récupérer le thread
    const thread = await Thread.findById(id);
    if (!thread) {
      return res.status(404).json({ success: false, message: 'Thread non trouvé' });
    }
    
    // Vérifier que le thread est déjà dans la corbeille pour cet utilisateur
    if (!thread.userThreadStatus.has(emailKey) || !thread.userThreadStatus.get(emailKey).isDeleted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le thread doit d\'abord être déplacé dans la corbeille avant d\'être supprimé définitivement' 
      });
    }
    
    // Récupérer tous les emails du thread
    const emails = await Email.find({ threadId: id });
    
    // Pour chaque email du thread
    for (const email of emails) {
      // Vérifier si d'autres utilisateurs ont accès à cet email
      const otherUsersHaveAccess = (
        (email.sender.email !== userEmail) || 
        email.recipients.to.some(r => r.email !== userEmail) ||
        email.recipients.cc.some(r => r.email !== userEmail) ||
        email.recipients.bcc.some(r => r.email !== userEmail)
      );
      
      // Vérifier si d'autres utilisateurs ont des statuts pour cet email
      const otherUserStatusCount = Array.from(email.userEmailStatus.keys())
        .filter(key => key !== emailKey)
        .length;
      
      if (!otherUsersHaveAccess && otherUserStatusCount === 0) {
        // Si personne d'autre n'a accès à cet email, le supprimer définitivement
        await Email.deleteOne({ _id: email._id });
      } else {
        // Sinon, supprimer uniquement le statut pour cet utilisateur
        // Pour garantir que l'utilisateur ne verra plus jamais cet email dans sa boîte
        email.userEmailStatus.delete(emailKey);
        
        // Supprimer cet utilisateur des listes de destinataires s'il s'y trouve
        // Cela garantit qu'il ne sera pas considéré comme destinataire lors de requêtes futures
        if (email.recipients.to && email.recipients.to.length > 0) {
          email.recipients.to = email.recipients.to.filter(r => r.email !== userEmail);
        }
        if (email.recipients.cc && email.recipients.cc.length > 0) {
          email.recipients.cc = email.recipients.cc.filter(r => r.email !== userEmail);
        }
        if (email.recipients.bcc && email.recipients.bcc.length > 0) {
          email.recipients.bcc = email.recipients.bcc.filter(r => r.email !== userEmail);
        }
        
        await email.save();
      }
    }
    
    // Vérifier si d'autres utilisateurs sont associés au thread
    const otherUserThreadStatus = Array.from(thread.userThreadStatus.keys())
      .filter(key => key !== emailKey)
      .length;
    
    // Vérifier si d'autres utilisateurs sont participants au thread
    const otherParticipants = thread.participants.some(
      participantId => participantId.toString() !== req.user._id.toString()
    );
    
    // Si personne d'autre n'est associé au thread, le supprimer définitivement
    if (otherUserThreadStatus === 0 && !otherParticipants) {
      await Thread.deleteOne({ _id: id });
      return res.status(200).json({ 
        success: true, 
        message: 'Thread et tous ses emails ont été supprimés définitivement' 
      });
    } else {
      // Sinon, supprimer l'utilisateur des participants et du statut du thread
      thread.participants = thread.participants.filter(
        participantId => participantId.toString() !== req.user._id.toString()
      );
      thread.userThreadStatus.delete(emailKey);
      await thread.save();
      
      return res.status(200).json({ 
        success: true, 
        message: 'Thread supprimé définitivement pour cet utilisateur' 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
},

  /**
   * Supprimer un email spécifique d'un thread
   * @route DELETE /api/threads/:threadId/emails/:emailId
   */
  deleteEmailFromThread: async (req, res) => {
    try {
      const { threadId, emailId } = req.params;
      const emailKey = encodeEmailKey(req.user.email);
      
      // Vérifier que le thread existe
      const thread = await Thread.findById(threadId);
      if (!thread) {
        return res.status(404).json({ success: false, message: 'Thread non trouvé' });
      }
      
      // Vérifier que l'email existe et appartient au thread
      const email = await Email.findOne({ _id: emailId, threadId });
      if (!email) {
        return res.status(404).json({ success: false, message: 'Email non trouvé dans ce thread' });
      }
      
      // Vérifier que l'utilisateur a accès à cet email
      if (!email.userEmailStatus.has(emailKey) && 
          email.sender.email !== req.user.email && 
          !email.recipients.to.some(r => r.email === req.user.email) &&
          !email.recipients.cc.some(r => r.email === req.user.email) &&
          !email.recipients.bcc.some(r => r.email === req.user.email)) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à cet email' });
      }
      
      // Marquer l'email comme supprimé pour cet utilisateur
      if (!email.userEmailStatus.has(emailKey)) {
        email.userEmailStatus.set(emailKey, {});
      }
      email.userEmailStatus.get(emailKey).isDeleted = true;
      await email.save();
      
      // Vérifier s'il s'agit du seul email dans le thread
      const emailCount = await Email.countDocuments({ 
        threadId,
        [`userEmailStatus.${emailKey}.isDeleted`]: { $ne: true }
      });
      
      // Si c'est le dernier email, marquer également le thread comme supprimé
      if (emailCount === 0) {
        if (!thread.userThreadStatus.has(emailKey)) {
          thread.userThreadStatus.set(emailKey, {});
        }
        thread.userThreadStatus.get(emailKey).isDeleted = true;
        await thread.save();
      }
      
      res.status(200).json({ success: true, message: 'Email supprimé du thread' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Marquer un thread entier comme lu
   * @route PATCH /api/threads/:id/read
   */
  markThreadAsRead: async (req, res) => {
    try {
      const { id } = req.params;
      const emailKey = encodeEmailKey(req.user.email);
      
      // Récupérer le thread
      const thread = await Thread.findById(id);
      if (!thread) {
        return res.status(404).json({ success: false, message: 'Thread non trouvé' });
      }
      
      // Mettre à jour le statut du thread
      if (!thread.userThreadStatus.has(emailKey)) {
        thread.userThreadStatus.set(emailKey, {});
      }
      thread.userThreadStatus.get(emailKey).isRead = true;
      thread.userThreadStatus.get(emailKey).readAt = new Date();
      await thread.save();
      
      // Récupérer tous les emails du thread où l'utilisateur est destinataire
      const emails = await Email.find({
        threadId: id,
        $or: [
          { 'recipients.to.email': req.user.email },
          { 'recipients.cc.email': req.user.email },
          { 'recipients.bcc.email': req.user.email }
        ]
      });
      
      // Marquer chaque email comme lu
      for (const email of emails) {
        if (!email.userEmailStatus.has(emailKey)) {
          email.userEmailStatus.set(emailKey, {});
        }
        
        if (!email.userEmailStatus.get(emailKey).isRead) {
          email.userEmailStatus.get(emailKey).isRead = true;
          email.userEmailStatus.get(emailKey).readAt = new Date();
          await email.save();
        }
      }
      
      res.status(200).json({ success: true, message: 'Thread marqué comme lu' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * Marquer un thread entier comme non lu
   * @route PATCH /api/threads/:id/unread
   */
  markThreadAsUnread: async (req, res) => {
    try {
      const { id } = req.params;
      const emailKey = encodeEmailKey(req.user.email);
      
      // Récupérer le thread
      const thread = await Thread.findById(id);
      if (!thread) {
        return res.status(404).json({ success: false, message: 'Thread non trouvé' });
      }
      
      // Mettre à jour le statut du thread
      if (!thread.userThreadStatus.has(emailKey)) {
        thread.userThreadStatus.set(emailKey, {});
      }
      thread.userThreadStatus.get(emailKey).isRead = false;
      thread.userThreadStatus.get(emailKey).readAt = null;
      await thread.save();
      
      // Récupérer tous les emails du thread où l'utilisateur est destinataire
      const emails = await Email.find({
        threadId: id,
        $or: [
          { 'recipients.to.email': req.user.email },
          { 'recipients.cc.email': req.user.email },
          { 'recipients.bcc.email': req.user.email }
        ]
      });
      
      // Marquer au moins le dernier email comme non lu
      if (emails.length > 0) {
        const lastEmail = emails.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0];
        
        if (!lastEmail.userEmailStatus.has(emailKey)) {
          lastEmail.userEmailStatus.set(emailKey, {});
        }
        
        lastEmail.userEmailStatus.get(emailKey).isRead = false;
        lastEmail.userEmailStatus.get(emailKey).readAt = null;
        await lastEmail.save();
      }
      
      res.status(200).json({ success: true, message: 'Thread marqué comme non lu' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = threadController;