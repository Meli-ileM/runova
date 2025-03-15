
const Email = require('../models/Email');
const Thread = require("../models/Thread");
const User = require('../models/User'); // Ajout de l'import manquant
const mongoose = require('mongoose');
const { encodeEmailKey, decodeEmailKey } = require('../utils/emailKey');
const emailEncryptionService = require('../services/EmailEncryptionService');



const { ObjectId } = mongoose.Types;

const emailController = {
// ============== MODIFICATION DU CONTROLLER createEmail ==============

// createEmail: async (req, res) => {
//   try {
//     const {
//       threadId,
//       parentEmailId,
//       sender,
//       subject,
//       body,
//       recipients,
//       attachments,
//       isDraft,
//       labels
//     } = req.body;

//     // **SECTION : Vérification de l'existence des destinataires**
//     if (!isDraft) {
//       const allRecipients = [
//         ...recipients.to,
//         ...recipients.cc,
//         ...recipients.bcc
//       ];

//       if (allRecipients.length > 0) {
//         const recipientEmails = allRecipients
//           .map(recipient => recipient.email)
//           .filter(email => email);

//         if (recipientEmails.length > 0) {
//           const existingUsers = await User.find({
//             email: { $in: recipientEmails }
//           }, 'email');

//           const existingEmails = existingUsers.map(user => user.email);
//           const nonExistentEmails = recipientEmails.filter(
//             email => !existingEmails.includes(email)
//           );

//           if (nonExistentEmails.length > 0) {
//             return res.status(400).json({
//               success: false,
//               message: `Ce destinataire n'existe pas : ${nonExistentEmails.join(', ')}`,
//               nonExistentRecipients: nonExistentEmails
//             });
//           }
//         }
//       }
//     }

//     // Gestion du thread
//     let emailThreadId;
//     let isNewThread = false;

//     if (parentEmailId) {
//       const parentEmail = await Email.findById(parentEmailId);
//       if (!parentEmail) {
//         return res.status(404).json({ success: false, message: "Email parent non trouvé" });
//       }
//       emailThreadId = parentEmail.threadId;
//     } 
//     else if (threadId) {
//       emailThreadId = threadId;
//     } 
//     else {
//       isNewThread = true;
      
//       const participantEmails = new Set();
//       const participantIds = new Set();
      
//       if (sender.email) participantEmails.add(sender.email);
//       if (sender.userId) participantIds.add(sender.userId);
    
//       [...recipients.to, ...recipients.cc, ...recipients.bcc].forEach(recipient => {
//         if (recipient.email) participantEmails.add(recipient.email);
//         if (recipient.userId) participantIds.add(recipient.userId);
//       });

//       const userThreadStatus = new Map();
//       participantEmails.forEach(email => {
//         userThreadStatus.set(encodeEmailKey(email), {});
//       });

//       const newThread = new Thread({
//         subject,
//         participants: Array.from(participantIds),
//         lastMessageAt: new Date(),
//         userThreadStatus
//       });

//       const savedThread = await newThread.save();
//       emailThreadId = savedThread._id;
//     }

//     // **SECTION MODIFIÉE : Chiffrement avec stockage du body chiffré**
//     let isEncrypted = false;      
//     let encryptedContent = null;
//     let finalBody = body; // Par défaut, utiliser le body original
//     let finalSubject = subject; // Par défaut, utiliser le subject original
    
//     if (!isDraft && attachments && attachments.length > 0) {
//       console.log('📎 AVANT chiffrement - Attachments reçus:', attachments.length);
//       attachments.forEach((att, index) => {
//         console.log(`  [${index}] ${att.name} - Taille: ${att.size || 'inconnue'} - Type: ${att.type}`);
//       });
//     }
    
//     if (!isDraft) {
//       try {
//         console.log('🔐 Début du processus de chiffrement...');
        
//         const encryptedData = await emailEncryptionService.encryptEmail(
//           { 
//             body, 
//             subject,
//             attachments: attachments || [] 
//           },
//           recipients,
//           sender
//         );
        
//         if (encryptedData && encryptedData.isEncrypted) {
//           isEncrypted = true;
          
//           // **MODIFICATION MAJEURE : Stocker le contenu chiffré directement dans le body**
//           finalBody = encryptedData.body; // Utiliser le body chiffré au lieu du message générique
//           finalSubject = encryptedData.subject || subject; // Utiliser le subject chiffré si disponible
          
//           // **Construction d'encryptedContent pour les métadonnées**
//           encryptedContent = {
//             encryptedSymKey: encryptedData.encryptedSymKey,
//             attachments: [], 
//             encryptionVersion: encryptedData.version || '1.0',
//             encryptionMethod: encryptedData.method || 'AES-256-GCM'
//           };
          
//           // **GESTION CORRIGÉE des attachments chiffrés**
//           if (encryptedData.attachments && Array.isArray(encryptedData.attachments)) {
//             console.log(`📎 APRÈS chiffrement - ${encryptedData.attachments.length} attachments traités`);
            
//             // Validation et logs détaillés
//             encryptedData.attachments.forEach((att, index) => {
//               console.log(`  [${index}] ${att.name}`);
//               console.log(`      - Chiffré: ${att.isEncrypted}`);
//               console.log(`      - Statut: ${att.encryptionStatus}`);
//               console.log(`      - Taille originale: ${att.originalSize}`);
//               console.log(`      - Taille chiffrée: ${att.size}`);
//               if (att.error) {
//                 console.log(`      - Erreur: ${att.error}`);
//               }
//             });
            
//             encryptedContent.attachments = encryptedData.attachments;
//             console.log('✅ Attachments assignés à encryptedContent');
//           } else {
//             console.log('⚠️ Aucun attachment chiffré reçu, utilisation des attachments originaux');
//             encryptedContent.attachments = attachments || [];
//           }
          
//           console.log(`✅ Message chiffré avec succès pour ${Object.keys(encryptedData.encryptedSymKey).length} utilisateurs`);
//           console.log(`📎 Total attachments dans encryptedContent: ${encryptedContent.attachments.length}`);
//         }
        
//       } catch (error) {
//         console.error('❌ Erreur lors du chiffrement:', error);
//         console.error('Stack:', error.stack);
        
//         // **IMPORTANT : Ne pas faire échouer l'email en cas d'erreur de chiffrement**
//         console.log('⚠️ Continuant sans chiffrement à cause de l\'erreur');
//         isEncrypted = false;
//         encryptedContent = null;
//         finalBody = body; // Revenir au body original
//         finalSubject = subject; // Revenir au subject original
//       }
//     }

//     // **CORRECTION : Assignation correcte des attachments à l'email**
//     let finalAttachments = [];
    
//     if (isEncrypted && encryptedContent && encryptedContent.attachments) {
//       // Utiliser les attachments chiffrés
//       finalAttachments = encryptedContent.attachments;
//       console.log(`📎 Utilisation des attachments chiffrés: ${finalAttachments.length}`);
//     } else {
//       // Utiliser les attachments originaux
//       finalAttachments = attachments || [];
//       console.log(`📎 Utilisation des attachments originaux: ${finalAttachments.length}`);
//     }

//     const newEmail = new Email({
//       threadId: emailThreadId,
//       parentEmailId: parentEmailId || null,
//       sender,
//       subject: finalSubject, // **MODIFIÉ : Utiliser le subject final (chiffré ou original)**
//       body: finalBody,       // **MODIFIÉ : Utiliser le body final (chiffré ou original)**
//       recipients,
//       attachments: finalAttachments,
//       isDraft: isDraft || false,
//       labels: labels || [],
//       isEncrypted,
//       encryptedContent
//     });

//     // Mettre à jour le statut de l'email pour chaque utilisateur
//     newEmail.userEmailStatus = new Map();
//     newEmail.userEmailStatus.set(encodeEmailKey(sender.email), {});
//     [...recipients.to, ...recipients.cc, ...recipients.bcc].forEach(r => {
//       if (r.email) {
//         newEmail.userEmailStatus.set(encodeEmailKey(r.email), {});
//       }
//     });

//     const savedEmail = await newEmail.save();
    
//     console.log(`✅ Email sauvegardé avec ${savedEmail.attachments.length} attachments`);

//     // Mettre à jour le thread
//     if (!isDraft || !isNewThread) {
//       const participantEmails = new Set();
//       const participantIds = new Set();
      
//       if (sender.email) participantEmails.add(sender.email);
//       if (sender.userId) participantIds.add(sender.userId);
      
//       [...recipients.to, ...recipients.cc, ...recipients.bcc].forEach(recipient => {
//         if (recipient.email) participantEmails.add(recipient.email);
//         if (recipient.userId) participantIds.add(recipient.userId);
//       });
      
//       const threadUpdate = {
//         lastMessageAt: new Date(),
//         $push: { emailIds: savedEmail._id }
//       };
      
//       if (participantIds.size > 0) {
//         threadUpdate.$addToSet = { 
//           participants: { 
//             $each: Array.from(participantIds)
//           }
//         };
//       }
      
//       if (!isNewThread) {
//         const existingThread = await Thread.findById(emailThreadId);
//         if (existingThread) {
//           for (const email of participantEmails) {
//             const emailKey = encodeEmailKey(email);
//             if (!existingThread.userThreadStatus.has(emailKey)) {
//               threadUpdate[`userThreadStatus.${emailKey}`] = {};
//             }
//           }
//         }
//       }
      
//       await Thread.findByIdAndUpdate(emailThreadId, threadUpdate);
//     }

//     res.status(201).json({ success: true, data: savedEmail });
    
//   } catch (error) {
//     console.error('❌ Erreur lors de la création de l\'email:', error);
//     console.error('Stack complète:', error.stack);
//     res.status(400).json({ 
//       success: false, 
//       message: error.message,
//       details: process.env.NODE_ENV === 'development' ? error.stack : undefined
//     });
//   }
// },


createEmail: async (req, res) => {
  try {
    const {
      threadId,
      parentEmailId,
      sender,
      subject,
      body,
      recipients,
      attachments,
      isDraft,
      labels
    } = req.body;

    // **NOUVELLE SECTION : Vérification de l'existence des destinataires**
    if (!isDraft) { // Ne vérifier que pour les emails non-brouillons
      const allRecipients = [
        ...recipients.to,
        ...recipients.cc,
        ...recipients.bcc
      ];

      if (allRecipients.length > 0) {
        // Extraire toutes les adresses email des destinataires
        const recipientEmails = allRecipients
          .map(recipient => recipient.email)
          .filter(email => email); // Filtrer les emails vides

        if (recipientEmails.length > 0) {
          // Vérifier l'existence des utilisateurs dans la base de données
          // Supposant que vous avez un modèle User avec un champ email
          const existingUsers = await User.find({
            email: { $in: recipientEmails }
          }, 'email');

          const existingEmails = existingUsers.map(user => user.email);
          const nonExistentEmails = recipientEmails.filter(
            email => !existingEmails.includes(email)
          );

          if (nonExistentEmails.length > 0) {
            return res.status(400).json({
              success: false,
              message: `Les destinataires suivants n'existent pas dans le système : ${nonExistentEmails.join(', ')}`,
              nonExistentRecipients: nonExistentEmails
            });
          }
        }
      }
    }
    // **FIN DE LA NOUVELLE SECTION**

    // Gestion du thread
    let emailThreadId;
    let isNewThread = false;

    // Si c'est une réponse à un email existant
    if (parentEmailId) {
      // Récupérer l'email parent pour obtenir son threadId
      const parentEmail = await Email.findById(parentEmailId);
      if (!parentEmail) {
        return res.status(404).json({ success: false, message: "Email parent non trouvé" });
      }
      emailThreadId = parentEmail.threadId;
    } 
    // Si un threadId est fourni, utiliser celui-là
    else if (threadId) {
      emailThreadId = threadId;
    } 
    // Sinon, créer un nouveau thread
    else {
      isNewThread = true;
      
      // Collecter tous les emails et userIds participants
      const participantEmails = new Set();
      const participantIds = new Set();
      
      // Ajouter l'expéditeur
      if (sender.email) participantEmails.add(sender.email);
      if (sender.userId) participantIds.add(sender.userId);
    
      // Ajouter tous les destinataires
      [...recipients.to, ...recipients.cc, ...recipients.bcc].forEach(recipient => {
        if (recipient.email) participantEmails.add(recipient.email);
        if (recipient.userId) participantIds.add(recipient.userId);
      });

      // Initialiser le userThreadStatus pour chaque email participant
      const userThreadStatus = new Map();
      participantEmails.forEach(email => {
        userThreadStatus.set(encodeEmailKey(email), {});
      });

      const newThread = new Thread({
        subject,
        participants: Array.from(participantIds),
        lastMessageAt: new Date(),
        userThreadStatus
      });

      const savedThread = await newThread.save();
      emailThreadId = savedThread._id;
    }

    // Ne pas chiffrer les brouillons
    let isEncrypted = false;      
    let encryptedContent = null;
    
    // Importer le service de chiffrement des emails
    
    if (!isDraft) {
      try {
        // Utiliser le service de chiffrement avec la méthode encryptEmail
        const encryptedData = await emailEncryptionService.encryptEmail(
          { 
            body, 
            subject,
            attachments: attachments || [] 
          },
          recipients,
          sender
        );
        
         if (encryptedData && encryptedData.isEncrypted) {
      isEncrypted = true;
      
      // ✅ CORRECTION: Construction plus explicite d'encryptedContent
      encryptedContent = {
        body: encryptedData.body,
        subject: encryptedData.subject || subject,
        attachments: [], // Initialiser comme tableau vide
        encryptedSymKey: encryptedData.encryptedSymKey
      };
      
      // ✅ CORRECTION: Gestion explicite des attachments chiffrés
      if (encryptedData.attachments) {
        console.log('🔍 DEBUG - encryptedData.attachments:', encryptedData.attachments);
        console.log('🔍 DEBUG - Type:', typeof encryptedData.attachments);
        console.log('🔍 DEBUG - Is Array:', Array.isArray(encryptedData.attachments));
        console.log('🔍 DEBUG - Length:', encryptedData.attachments.length);
        
        if (Array.isArray(encryptedData.attachments) && encryptedData.attachments.length > 0) {
          encryptedContent.attachments = encryptedData.attachments;
          console.log('✅ Attachments chiffrés assignés à encryptedContent');
        } else {
          console.log('⚠️ encryptedData.attachments existe mais est vide ou pas un tableau');
          encryptedContent.attachments = attachments || [];
        }
      } else {
        console.log('⚠️ encryptedData.attachments n\'existe pas');
        encryptedContent.attachments = attachments || [];
      }
      
      console.log('🔍 DEBUG - encryptedContent final:', JSON.stringify(encryptedContent, null, 2));
      console.log(`Message chiffré avec succès pour ${Object.keys(encryptedData.encryptedSymKey).length} utilisateurs`);
      console.log('Contenu chiffré (body) :', encryptedData.body);
      console.log('subject est chiffré :', encryptedContent.subject);
      console.log('attachments chiffrés :', encryptedContent.attachments);
      
      // ✅ AJOUT: Log détaillé des attachments pour debug
      if (encryptedContent.attachments && encryptedContent.attachments.length > 0) {
        console.log('Détails des attachments chiffrés:');
        encryptedContent.attachments.forEach((att, index) => {
          console.log(`  [${index}] ${att.name} - Chiffré: ${att.isEncrypted} - Statut: ${att.encryptionStatus}`);
        });
      } else {
        console.log('⚠️ Aucun attachment dans encryptedContent.attachments');
      }
    }
  }catch (error) {
        console.error('Erreur lors du chiffrement:', error);
        // Continuer sans chiffrement en cas d'erreur
        isEncrypted = false;
      }
    }

    const newEmail = new Email({
      threadId: emailThreadId,
      parentEmailId: parentEmailId || null,
      sender,
       subject: isEncrypted ? encryptedContent.subject : subject, // Stocker le contenu chiffré réel
      body: isEncrypted ? encryptedContent.body : body,
      recipients,
    attachments: isEncrypted && encryptedContent && encryptedContent.attachments 
    ? encryptedContent.attachments 
    : (attachments || []),
      isDraft: isDraft || false,
      labels: labels || [],
      isEncrypted,
      encryptedContent,
    
    });

    // Mettre à jour le statut de l'email pour chaque utilisateur
    newEmail.userEmailStatus = new Map();
    newEmail.userEmailStatus.set(encodeEmailKey(sender.email), {});
    [...recipients.to, ...recipients.cc, ...recipients.bcc].forEach(r => {
      if (r.email) {
        newEmail.userEmailStatus.set(encodeEmailKey(r.email), {});
      }
    });

    const savedEmail = await newEmail.save();

    // Mettre à jour la date du dernier message dans le thread et ajouter l'ID de l'email
    if (!isDraft || !isNewThread) {
      // Collecter tous les emails et userIds uniques
      const participantEmails = new Set();
      const participantIds = new Set();
      
      // Ajouter l'expéditeur
      if (sender.email) participantEmails.add(sender.email);
      if (sender.userId) participantIds.add(sender.userId);
      
      // Ajouter tous les destinataires
      [...recipients.to, ...recipients.cc, ...recipients.bcc].forEach(recipient => {
        if (recipient.email) participantEmails.add(recipient.email);
        if (recipient.userId) participantIds.add(recipient.userId);
      });
      
      // Préparer les mises à jour pour userThreadStatus
      const threadUpdate = {
        lastMessageAt: new Date(),
        $push: { emailIds: savedEmail._id }
      };
      
      // Si des userIds sont présents, les ajouter aux participants
      if (participantIds.size > 0) {
        threadUpdate.$addToSet = { 
          participants: { 
            $each: Array.from(participantIds)
          }
        };
      }
      
      // Si ce n'est pas un nouveau thread, récupérer d'abord le thread existant pour mettre à jour userThreadStatus
      if (!isNewThread) {
        const existingThread = await Thread.findById(emailThreadId);
        if (existingThread) {
          // Pour chaque email, s'assurer qu'il existe dans userThreadStatus
          for (const email of participantEmails) {
            const emailKey = encodeEmailKey(email);
            if (!existingThread.userThreadStatus.has(emailKey)) {
              // Utiliser l'opérateur $set pour ajouter une nouvelle entrée à la Map
              threadUpdate[`userThreadStatus.${emailKey}`] = {};
            }
          }
        }
      }
      
      await Thread.findByIdAndUpdate(emailThreadId, threadUpdate);
    }

    res.status(201).json({ success: true, data: savedEmail });
  } catch (error) {
    console.error('Erreur lors de la création de l\'email:', error);
    res.status(400).json({ success: false, message: error.message });
  }
},

getEmails: async (req, res) => {
  try {
    const email = req.user.email;
    const emailKey = encodeEmailKey(email);
    const {
      folder = 'inbox',
      page = 1,
      limit = 20,
      search,
      label,
      password
    } = req.query;

    console.log('[getEmails] Utilisateur :', email);
    console.log('[getEmails] Requête - dossier:', folder, '| page:', page, '| limit:', limit, '| search:', search, '| label:', label);
    console.log('[getEmails] Mot de passe fourni :', password ? 'Oui' : 'Non');

    const skip = (page - 1) * limit;
    
    // CORRECTION: Initialiser la requête de base avec le filtrage des emails supprimés
     let query = {
      $or: [
        // L'utilisateur n'existe pas dans userEmailStatus (jamais supprimé)
        { [`userEmailStatus.${emailKey}`]: { $exists: false } },
        // L'utilisateur existe mais isDeleted n'est pas true
        { [`userEmailStatus.${emailKey}.isDeleted`]: { $ne: true } }
      ]
    };

    switch (folder.trim()) {
      case 'inbox':
        query = {
          $and: [
            // L'utilisateur doit exister dans userEmailStatus ET ne pas être supprimé
            { [`userEmailStatus.${emailKey}`]: { $exists: true } },
            { [`userEmailStatus.${emailKey}.isDeleted`]: { $ne: true } },
            {
              $or: [
                { 'recipients.to.email': email },
                { 'recipients.cc.email': email },
                { 'recipients.bcc.email': email }
              ]
            }
          ],
          isDraft: false
        };
        break;
      case 'sent':
        query = {
          $and: [
            // L'utilisateur doit exister dans userEmailStatus ET ne pas être supprimé
            { [`userEmailStatus.${emailKey}`]: { $exists: true } },
            { [`userEmailStatus.${emailKey}.isDeleted`]: { $ne: true } },
            { 'sender.email': email }
          ],
          isDraft: false
        };
        break;
      case 'drafts':
        query = {
          $and: [
            // L'utilisateur doit exister dans userEmailStatus ET ne pas être supprimé
            { [`userEmailStatus.${emailKey}`]: { $exists: true } },
            { [`userEmailStatus.${emailKey}.isDeleted`]: { $ne: true } },
            { 'sender.email': email }
          ],
          isDraft: true
        };
        break;
      case 'archived':
        query = {
          $and: [
            { [`userEmailStatus.${emailKey}`]: { $exists: true } },
            { [`userEmailStatus.${emailKey}.isDeleted`]: { $ne: true } },
            { [`userEmailStatus.${emailKey}.isArchived`]: true }
          ]
        };
        break;
      case 'important':
        query = {
          $and: [
            { [`userEmailStatus.${emailKey}`]: { $exists: true } },
            { [`userEmailStatus.${emailKey}.isDeleted`]: { $ne: true } },
            { [`userEmailStatus.${emailKey}.isImportant`]: true }
          ]
        };
        break;
      case 'trash':
        // Pour la corbeille, on veut seulement les emails supprimés
        query = { [`userEmailStatus.${emailKey}.isDeleted`]: true };
        break;
    }
     if (search) {
      const searchConditions = [
        { subject: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } },
        { 'sender.email': { $regex: search, $options: 'i' } },
        { 'sender.name': { $regex: search, $options: 'i' } },
        { 'recipients.to.email': { $regex: search, $options: 'i' } },
        { 'recipients.to.name': { $regex: search, $options: 'i' } },
        { 'recipients.cc.email': { $regex: search, $options: 'i' } },
        { 'recipients.cc.name': { $regex: search, $options: 'i' } },
        { 'recipients.bcc.email': { $regex: search, $options: 'i' } },
        { 'recipients.bcc.name': { $regex: search, $options: 'i' } }
      ];

      // Si on a déjà une condition $or (comme pour inbox), on doit la préserver
      if (query.$or) {
        // Combiner les conditions existantes avec la recherche
        const existingOr = query.$or;
        query = {
          ...query,
          $and: [
            { $or: existingOr },
            { $or: searchConditions }
          ]
        };
        delete query.$or; // Supprimer l'ancien $or car il est maintenant dans $and
      } else if (query.$and) {
        // Si on a déjà une condition $and, ajouter la recherche
        query.$and.push({ $or: searchConditions });
      } else {
        // Si pas de conditions complexes existantes, ajouter simplement la recherche
        query.$or = searchConditions;
      }
    }


    if (label) {
      query.labels = ObjectId(label);
    }

    console.log('[getEmails] Requête MongoDB :', JSON.stringify(query));

    const emails = await Email.find(query)
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('labels', 'name color')
      .populate('threadId', 'subject participants')
      .populate('parentEmailId', 'subject sender');

    console.log('[getEmails] Emails récupérés :', emails.length);
    console.log('[getEmails] Emails chiffrés :', emails.filter(e => e.isEncrypted).length);

    const total = await Email.countDocuments(query);
    
    // Tableau pour stocker les emails avec les contenus déchiffrés si nécessaire
    const processedEmails = [];

    // Vérifier si un mot de passe est fourni pour le déchiffrement
    if (password) {
      console.log('[getEmails] Déchiffrement activé');

      for (const email of emails) {
        let processedEmail = { ...email._doc };
        
        if (email.isEncrypted && email.encryptedContent) {
          console.log(`[getEmails] Email ${email._id} est chiffré, tentative de déchiffrement`);
          
          try {
            // Vérifier que tous les éléments nécessaires sont présents
            if (!email.encryptedContent.body || !email.encryptedContent.encryptedSymKey) {
              console.log(`[getEmails] Données chiffrées incomplètes pour email ${email._id}`);
              throw new Error("Données chiffrées incomplètes");
            }
            
          
            const regularEmailKey = req.user.email;
            const encodedEmailKey = encodeEmailKey(req.user.email);
            
            // Essayer avec la clé encodée d'abord
            let hasKey = email.encryptedContent.encryptedSymKey && 
                         email.encryptedContent.encryptedSymKey[encodedEmailKey] !== undefined;
            
            // Si la clé encodée ne fonctionne pas, essayer avec l'email original
            if (!hasKey) {
                hasKey = email.encryptedContent.encryptedSymKey && 
                         email.encryptedContent.encryptedSymKey[regularEmailKey] !== undefined;
            }
            
            if (!hasKey) {
              console.log(`[getEmails] Aucune clé trouvée pour l'utilisateur ${encodedEmailKey} dans l'email ${email._id}`);
              throw new Error("Aucune clé de déchiffrement trouvée pour cet utilisateur");
            }
            
            // Déchiffrer le corps du message - Utiliser l'email non encodé car c'est ce que le decryptEmail attend
            const decryptedData = await emailEncryptionService.decryptEmail({
              isEncrypted: email.isEncrypted,
              body: email.encryptedContent.body,
              encryptedSymKey: email.encryptedContent.encryptedSymKey,
              attachments: email.encryptedContent.attachments || []
            }, req.user.email, password);
            
            
            // Mettre à jour avec le contenu déchiffré
            processedEmail.body = decryptedData.body;
            processedEmail.isDecrypted = true;
            console.log(`[getEmails] Corps déchiffré pour email ${email._id}`);
            
            // Déchiffrer les pièces jointes si elles existent
            if (email.encryptedContent.attachments && email.encryptedContent.attachments.length > 0) {
              processedEmail.attachments = decryptedData.attachments;
              console.log(`[getEmails] ${decryptedData.attachments.length} pièces jointes déchiffrées pour email ${email._id}`);
            }
            
            // Déchiffrer le sujet s'il est chiffré
            if (email.encryptedContent.subject) {
              try {
                const decryptedSubject = await emailEncryptionService.decryptEmail({
                  isEncrypted: email.isEncrypted,
                  body: email.encryptedContent.subject,
                  encryptedSymKey: email.encryptedContent.encryptedSymKey,
                  attachments: []
                }, req.user.email, password);
                
                processedEmail.subject = decryptedSubject.body;
                console.log(`[getEmails] Sujet déchiffré pour email ${email._id}`);
              } catch (subjectError) {
                console.error(`[getEmails] Échec du déchiffrement du sujet pour email ${email._id}:`, subjectError.message);
                // Garder le sujet original si le déchiffrement échoue
              }
            }
            
            console.log(`[getEmails] Email ID ${email._id} déchiffré avec succès`);
          } catch (error) {
            console.error(`[getEmails] Échec du déchiffrement pour email ${email._id}:`, error.message);
            processedEmail.decryptionFailed = true;
            processedEmail.decryptionError = "Impossible de déchiffrer cet email. Vérifiez votre mot de passe.";
          }
        } else {
          console.log(`[getEmails] Email ${email._id} n'est pas chiffré ou ne contient pas de données chiffrées`);
        }
        
        processedEmails.push(processedEmail);
      }
    } else {
      // Si aucun mot de passe n'est fourni, utiliser les emails tels quels
      console.log('[getEmails] Aucun mot de passe fourni, pas de déchiffrement');
      emails.forEach(email => {
        processedEmails.push({ ...email._doc });
      });
    }

    res.status(200).json({
      success: true,
      count: processedEmails.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: processedEmails
    });
  } catch (error) {
    console.error('[getEmails] Erreur serveur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
},
getThreadEmails: async (req, res) => {
  try {
    const { threadId } = req.params;
    const { password } = req.query;
    const userEmail = req.user.email;
    const encodedEmailKey = encodeEmailKey(userEmail);

    console.log('[getThreadEmails] Thread ID:', threadId);
    console.log('[getThreadEmails] Utilisateur :', userEmail);
    console.log('[getThreadEmails] Clé encodée :', encodedEmailKey);
    console.log('[getThreadEmails] Mot de passe fourni :', password ? 'Oui' : 'Non');

    const thread = await Thread.findById(threadId);
    if (!thread) {
      console.log('[getThreadEmails] Thread non trouvé');
      return res.status(404).json({ success: false, message: 'Thread non trouvé' });
    }

    const emails = await Email.find({
      threadId,
      [`userEmailStatus.${encodedEmailKey}.isDeleted`]: { $ne: true },
      isDraft: false
    })
    .sort({ sentAt: 1 })
    .populate('labels', 'name color');

    console.log('[getThreadEmails] Emails récupérés dans le thread:', emails.length);
    console.log('[getThreadEmails] Emails chiffrés dans le thread:', emails.filter(e => e.isEncrypted).length);

    const processedEmails = [];
    
    if (password) {
      console.log('[getThreadEmails] Déchiffrement activé');
      
      for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
        let processedEmail = { ...email._doc };
        
        if (email.isEncrypted && email.encryptedContent) {
          console.log(`[getThreadEmails] Email ${email._id} est chiffré, tentative de déchiffrement`);
          
          try {
            // Vérifier que tous les éléments nécessaires sont présents
            if (!email.encryptedContent.body || !email.encryptedContent.encryptedSymKey) {
              console.log(`[getThreadEmails] Données chiffrées incomplètes pour email ${email._id}`);
              throw new Error("Données chiffrées incomplètes");
            }
            
            // CORRECTION: Essayer avec la clé encodée ET la clé non encodée
            const regularEmailKey = userEmail;
            
            // Essayer avec la clé encodée d'abord
            let hasKey = email.encryptedContent.encryptedSymKey && 
                         email.encryptedContent.encryptedSymKey[encodedEmailKey] !== undefined;
            
            // Si la clé encodée ne fonctionne pas, essayer avec l'email original
            if (!hasKey) {
                hasKey = email.encryptedContent.encryptedSymKey && 
                         email.encryptedContent.encryptedSymKey[regularEmailKey] !== undefined;
            }
            
            if (!hasKey) {
              console.log(`[getThreadEmails] Aucune clé trouvée pour l'utilisateur (encodé: ${encodedEmailKey}, original: ${regularEmailKey}) dans l'email ${email._id}`);
              throw new Error("Aucune clé de déchiffrement trouvée pour cet utilisateur");
            }

            const decryptedData = await emailEncryptionService.decryptEmail({
              isEncrypted: email.isEncrypted,
              body: email.encryptedContent.body,
              encryptedSymKey: email.encryptedContent.encryptedSymKey,
              attachments: email.encryptedContent.attachments || []
            }, userEmail, password);

            processedEmail.body = decryptedData.body;
            processedEmail.isDecrypted = true;
            console.log(`[getThreadEmails] Corps déchiffré pour email ${email._id}`);
            
            // Déchiffrer les pièces jointes si elles existent
            if (email.encryptedContent.attachments && email.encryptedContent.attachments.length > 0) {
              processedEmail.attachments = decryptedData.attachments;
              console.log(`[getThreadEmails] ${decryptedData.attachments.length} pièces jointes déchiffrées pour email ${email._id}`);
            }

            if (email.encryptedContent.subject) {
              try {
                const decryptedSubject = await emailEncryptionService.decryptEmail({
                  isEncrypted: email.isEncrypted,
                  body: email.encryptedContent.subject,
                  encryptedSymKey: email.encryptedContent.encryptedSymKey,
                  attachments: []
                }, userEmail, password);
                
                processedEmail.subject = decryptedSubject.body;
                console.log(`[getThreadEmails] Sujet déchiffré pour email ${email._id}`);
              } catch (subjectError) {
                console.error(`[getThreadEmails] Échec du déchiffrement du sujet pour email ${email._id}:`, subjectError.message);
                // Garder le sujet original si le déchiffrement échoue
              }
            }
            
            console.log(`[getThreadEmails] Email ID ${email._id} déchiffré avec succès`);
          } catch (error) {
            console.error(`[getThreadEmails] Erreur de déchiffrement ${email._id}:`, error.message);
            processedEmail.decryptionFailed = true;
            processedEmail.decryptionError = "Impossible de déchiffrer cet email. Vérifiez votre mot de passe.";
          }
        } else {
          console.log(`[getThreadEmails] Email ${email._id} n'est pas chiffré ou ne contient pas de données chiffrées`);
        }
        
        processedEmails.push(processedEmail);
      }
    } else {
      // Si aucun mot de passe n'est fourni, utiliser les emails tels quels
      console.log('[getThreadEmails] Aucun mot de passe fourni, pas de déchiffrement');
      emails.forEach(email => {
        processedEmails.push({ ...email._doc });
      });
    }

    res.status(200).json({
      success: true,
      count: processedEmails.length,
      threadSubject: thread.subject,
      data: processedEmails
    });
  } catch (error) {
    console.error('[getThreadEmails] Erreur serveur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
},
// Fix pour getEmailById avec support des brouillons
getEmailById: async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.query;
    const userEmail = req.user.email;
    const encodedEmailKey = encodeEmailKey(userEmail);

    console.log('[getEmailById] Email ID:', id);
    console.log('[getEmailById] Utilisateur:', userEmail);
    console.log('[getEmailById] Clé encodée:', encodedEmailKey);
    console.log('[getEmailById] Mot de passe fourni:', password ? 'Oui' : 'Non');

    const email = await Email.findById(id)
      .populate('labels', 'name color')
      .populate('threadId', 'subject');

    if (!email) {
      console.log('[getEmailById] Email non trouvé');
      return res.status(404).json({ success: false, message: 'Email non trouvé' });
    }

    // CORRECTION: Vérification spéciale pour les brouillons
    if (email.isDraft) {
      console.log('[getEmailById] Email identifié comme brouillon');
      
      // Pour les brouillons, vérifier que l'utilisateur est le créateur
      const senderEmail = email.sender?.email || email.from?.email;
      
      if (senderEmail !== userEmail) {
        console.log('[getEmailById] Accès interdit au brouillon pour', userEmail, '- Créateur:', senderEmail);
        return res.status(403).json({ 
          success: false, 
          message: 'Accès non autorisé à ce brouillon' 
        });
      }
      
      console.log('[getEmailById] Accès autorisé au brouillon pour', userEmail);
    } else {
      // POUR LES EMAILS NORMAUX: Vérifier le userEmailStatus
      let userStatus = null;
      
      // Essayer avec la clé encodée d'abord
      if (email.userEmailStatus && email.userEmailStatus[encodedEmailKey]) {
        userStatus = email.userEmailStatus[encodedEmailKey];
      } 
      // Si la clé encodée ne fonctionne pas, essayer avec l'email original
      else if (email.userEmailStatus && email.userEmailStatus[userEmail]) {
        userStatus = email.userEmailStatus[userEmail];
      }
      
      if (!userStatus) {
        console.log('[getEmailById] Accès interdit pour', userEmail);
        return res.status(403).json({ 
          success: false, 
          message: 'Accès non autorisé à cet email' 
        });
      }

      console.log('[getEmailById] Lecture autorisée pour email normal');

      // Marquer l'email comme lu si l'utilisateur est un destinataire
      if (email.recipients.to.some(r => r.email === userEmail) ||
          email.recipients.cc.some(r => r.email === userEmail) ||
          email.recipients.bcc.some(r => r.email === userEmail)) {

        // On utilise la version de la clé qui a été trouvée dans userEmailStatus
        const userStatusKey = email.userEmailStatus[encodedEmailKey] ? encodedEmailKey : userEmail;
        
        if (!userStatus.isRead) {
          userStatus.isRead = true;
          userStatus.readAt = new Date();
          await email.save();
          console.log('[getEmailById] Email marqué comme lu');

          const thread = await Thread.findById(email.threadId);
          if (thread) {
            // Vérifier et mettre à jour le statut de thread
            if (!thread.userThreadStatus[userStatusKey]) {
              thread.userThreadStatus[userStatusKey] = {};
            }
            thread.userThreadStatus[userStatusKey].isRead = true;
            thread.userThreadStatus[userStatusKey].readAt = new Date();
            await thread.save();
            console.log('[getEmailById] Thread mis à jour comme lu');
          }
        }
      }
    }

    let emailResponse = { ...email._doc };
    
    // Si l'email est chiffré, ajouter un indicateur pour le frontend
    if (email.isEncrypted && email.encryptedContent) {
      emailResponse.requiresDecryption = true;
      
      // Si un mot de passe est fourni, tenter le déchiffrement
      if (password) {
        try {
          console.log(`[getEmailById] Tentative de déchiffrement pour l'email ${id}`);
          
          // Essayer avec la clé encodée ET la clé non encodée
          const regularEmailKey = userEmail;
          
          // Essayer avec la clé encodée d'abord
          let hasKey = email.encryptedContent.encryptedSymKey && 
                       email.encryptedContent.encryptedSymKey[encodedEmailKey] !== undefined;
          
          // Si la clé encodée ne fonctionne pas, essayer avec l'email original
          if (!hasKey) {
              hasKey = email.encryptedContent.encryptedSymKey && 
                       email.encryptedContent.encryptedSymKey[regularEmailKey] !== undefined;
          }
          
          if (!hasKey) {
            console.log(`[getEmailById] Aucune clé trouvée pour l'utilisateur (encodé: ${encodedEmailKey}, original: ${regularEmailKey}) dans l'email ${id}`);
            throw new Error("Aucune clé de déchiffrement trouvée pour cet utilisateur");
          }
          
          const decryptedData = await emailEncryptionService.decryptEmail({
            isEncrypted: email.isEncrypted,
            body: email.encryptedContent.body,
            encryptedSymKey: email.encryptedContent.encryptedSymKey,
            attachments: email.encryptedContent.attachments || []
          }, userEmail, password);

          emailResponse.body = decryptedData.body;
          emailResponse.isDecrypted = true;
          console.log(`[getEmailById] Corps déchiffré pour email ${id}`);
          
          // Déchiffrer les pièces jointes si elles existent
          if (email.encryptedContent.attachments && email.encryptedContent.attachments.length > 0) {
            emailResponse.attachments = decryptedData.attachments;
            console.log(`[getEmailById] ${decryptedData.attachments.length} pièces jointes déchiffrées`);
          }

          // Déchiffrer le sujet s'il est chiffré
          if (email.encryptedContent.subject) {
            try {
              const decryptedSubject = await emailEncryptionService.decryptEmail({
                isEncrypted: email.isEncrypted,
                body: email.encryptedContent.subject,
                encryptedSymKey: email.encryptedContent.encryptedSymKey,
                attachments: []
              }, userEmail, password);
              
              emailResponse.subject = decryptedSubject.body;
              console.log(`[getEmailById] Sujet déchiffré pour email ${id}`);
            } catch (subjectError) {
              console.error(`[getEmailById] Échec du déchiffrement du sujet:`, subjectError.message);
              // Garder le sujet original si le déchiffrement échoue
            }
          }
          
          console.log(`[getEmailById] Email ${id} déchiffré avec succès`);
        } catch (error) {
          console.error(`[getEmailById] Erreur de déchiffrement:`, error.message);
          emailResponse.decryptionFailed = true;
          emailResponse.decryptionError = "Impossible de déchiffrer cet email. Vérifiez votre mot de passe.";
        }
      } else {
        console.log(`[getEmailById] Email ${id} est chiffré mais aucun mot de passe n'est fourni`);
        emailResponse.body = "Ce message est chiffré. Veuillez fournir votre mot de passe pour le lire.";
      }
    } else {
      console.log(`[getEmailById] Email ${id} n'est pas chiffré ou ne contient pas de données chiffrées`);
    }

    res.status(200).json({
      success: true,
      data: emailResponse
    });
  } catch (error) {
    console.error('[getEmailById] Erreur serveur:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
},
  archiveEmail: async (req, res) => {
    try {
      const { id } = req.params;
      const emailKey = encodeEmailKey(req.user.email);
      const mail = await Email.findById(id);

      if (!mail) return res.status(404).json({ success: false });
      if (!mail.userEmailStatus.has(emailKey)) mail.userEmailStatus.set(emailKey, {});

      mail.userEmailStatus.get(emailKey).isArchived = true;
      await mail.save();

      // Mettre à jour également l'état du thread
      const thread = await Thread.findById(mail.threadId);
      if (thread) {
        if (!thread.userThreadStatus.has(emailKey)) {
          thread.userThreadStatus.set(emailKey, {});
        }
        thread.userThreadStatus.get(emailKey).isArchived = true;
        await thread.save();
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  unarchiveEmail: async (req, res) => {
    try {
      const { id } = req.params;
      const emailKey = encodeEmailKey(req.user.email);
      const mail = await Email.findById(id);

      if (!mail) return res.status(404).json({ success: false });
      if (!mail.userEmailStatus.has(emailKey)) mail.userEmailStatus.set(emailKey, {});

      mail.userEmailStatus.get(emailKey).isArchived = false;
      await mail.save();

      // Mettre à jour également l'état du thread
      const thread = await Thread.findById(mail.threadId);
      if (thread) {
        if (!thread.userThreadStatus.has(emailKey)) {
          thread.userThreadStatus.set(emailKey, {});
        }
        thread.userThreadStatus.get(emailKey).isArchived = false;
        await thread.save();
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  markAsImportant: async (req, res) => {
    try {
      const { id } = req.params;
      const emailKey = encodeEmailKey(req.user.email);
      const mail = await Email.findById(id);

      if (!mail) return res.status(404).json({ success: false });
      if (!mail.userEmailStatus.has(emailKey)) mail.userEmailStatus.set(emailKey, {});

      mail.userEmailStatus.get(emailKey).isImportant = true;
      await mail.save();

      // Mettre à jour également l'état du thread
      const thread = await Thread.findById(mail.threadId);
      if (thread) {
        if (!thread.userThreadStatus.has(emailKey)) {
          thread.userThreadStatus.set(emailKey, {});
        }
        thread.userThreadStatus.get(emailKey).isImportant = true;
        await thread.save();
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  unmarkAsImportant: async (req, res) => {
    try {
      const { id } = req.params;
      const emailKey = encodeEmailKey(req.user.email);
      const mail = await Email.findById(id);

      if (!mail) return res.status(404).json({ success: false });
      if (!mail.userEmailStatus.has(emailKey)) mail.userEmailStatus.set(emailKey, {});

      mail.userEmailStatus.get(emailKey).isImportant = false;
      await mail.save();

      // Mettre à jour également l'état du thread
      const thread = await Thread.findById(mail.threadId);
      if (thread) {
        if (!thread.userThreadStatus.has(emailKey)) {
          thread.userThreadStatus.set(emailKey, {});
        }
        thread.userThreadStatus.get(emailKey).isImportant = false;
        await thread.save();
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

 moveToTrash: async (req, res) => {
  try {
    const { id } = req.params;
    const emailKey = encodeEmailKey(req.user.email);
    
    const mail = await Email.findById(id);
    if (!mail) return res.status(404).json({ success: false });
    
    // Marquer comme supprimé pour cet utilisateur
    if (!mail.userEmailStatus.has(emailKey)) {
      mail.userEmailStatus.set(emailKey, {});
    }
    mail.userEmailStatus.get(emailKey).isDeleted = true;
    
    // Mettre à jour également l'état du thread
    const thread = await Thread.findById(mail.threadId);
    if (thread) {
      if (!thread.userThreadStatus.has(emailKey)) {
        thread.userThreadStatus.set(emailKey, {});
      }
      thread.userThreadStatus.get(emailKey).isDeleted = true;
      await thread.save();
    }
    
    await mail.save();
    res.json({ success: true, message: 'Déplacé vers la corbeille' });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
},

// Fonction pour suppression définitive
permanentDelete: async (req, res) => {
  try {
    const { id } = req.params;
    const emailKey = encodeEmailKey(req.user.email);
    
    console.log(`Suppression définitive pour utilisateur: ${emailKey}, email: ${id}`);
    
    // Vérifier d'abord si l'email existe
    const mail = await Email.findById(id);
    if (!mail) return res.status(404).json({ success: false });
    
    const threadId = mail.threadId;
    console.log(`Email trouvé, threadId: ${threadId}`);
    console.log(`userEmailStatus size avant: ${mail.userEmailStatus.size}`);
    
    // Supprimer l'utilisateur du userEmailStatus avec une requête MongoDB native
    await Email.updateOne(
      { _id: id },
      { $unset: { [`userEmailStatus.${emailKey}`]: "" } }
    );
    
    // Vérifier si le userEmailStatus est maintenant vide
    const updatedMail = await Email.findById(id);
    console.log(`userEmailStatus size après: ${updatedMail.userEmailStatus.size}`);
    
    // Si le userEmailStatus est vide, supprimer l'email
    if (updatedMail.userEmailStatus.size === 0) {
      console.log('userEmailStatus vide, suppression de l\'email');
      
      // Supprimer l'email
      await Email.deleteOne({ _id: id });
      
      // Mettre à jour le thread
      if (threadId) {
        await Thread.updateOne(
          { _id: threadId },
          { $pull: { emailIds: id } }
        );
        
        // Vérifier s'il reste des emails dans le thread
        const remainingEmails = await Email.countDocuments({ threadId: threadId });
        console.log(`Emails restants dans le thread: ${remainingEmails}`);
        
        if (remainingEmails === 0) {
          await Thread.deleteOne({ _id: threadId });
          return res.json({ success: true, message: 'Email et thread supprimés définitivement' });
        }
      }
      
      return res.json({ success: true, message: 'Email supprimé définitivement' });
    }
    
    res.json({ success: true, message: `Email supprimé pour cet utilisateur (${updatedMail.userEmailStatus.size} utilisateurs restants)` });
    
  } catch (error) {
    console.error('Erreur dans permanentDelete:', error);
    res.status(500).json({ success: false, message: error.message });
  }
},


// Fonction pour restaurer depuis la corbeille
restoreFromTrash: async (req, res) => {
  try {
    const { id } = req.params;
    const emailKey = encodeEmailKey(req.user.email);
    
    const mail = await Email.findById(id);
    if (!mail) return res.status(404).json({ success: false });
    
    // Restaurer l'email pour cet utilisateur
    if (mail.userEmailStatus.has(emailKey)) {
      mail.userEmailStatus.get(emailKey).isDeleted = false;
      delete mail.userEmailStatus.get(emailKey).permanentlyDeleted;
    }
    
    // Restaurer également le thread
    const thread = await Thread.findById(mail.threadId);
    if (thread && thread.userThreadStatus.has(emailKey)) {
      thread.userThreadStatus.get(emailKey).isDeleted = false;
      delete thread.userThreadStatus.get(emailKey).permanentlyDeleted;
      await thread.save();
    }
    
    await mail.save();
    res.json({ success: true, message: 'Email restauré' });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
},
  /* Ajouter une pièce jointe à un email
  * @route POST /api/emails/:id/attachments
  */
 addAttachment: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const { name, url, type, size } = req.body;
      
      // Vérifier que l'email existe et appartient à l'utilisateur
      const email = await Email.findOne({
        _id: id,
        'sender.userId': userId
      });
      
      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Email non trouvé ou accès refusé'
        });
      }

      
      // Ajouter la pièce jointe
      email.attachments.push({
        name,
        url,
        type,
        size,
        uploadedAt: new Date()
      });
      
      const updatedEmail = await email.save();
      
      res.status(200).json({
        success: true,
        data: updatedEmail.attachments
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

 /**
  * Supprimer une pièce jointe d'un email
  * @route DELETE /api/emails/:id/attachments/:attachmentId
  */
 removeAttachment: async (req, res) => {
   try {
     const { id, attachmentId } = req.params;
     const userId = req.user._id;
     
     // Vérifier que l'email existe et appartient à l'utilisateur
     const email = await Email.findOne({
       _id: id,
       'sender.userId': userId
     });
     
     if (!email) {
       return res.status(404).json({
         success: false,
         message: 'Email non trouvé ou accès refusé'
       });
     }
     
     // Filtrer les pièces jointes pour retirer celle à supprimer
     email.attachments = email.attachments.filter(
       attachment => attachment._id.toString() !== attachmentId
     );
     
     const updatedEmail = await email.save();
     
     res.status(200).json({
       success: true,
       data: updatedEmail.attachments
     });
   } catch (error) {
     res.status(400).json({
       success: false,
       message: error.message
     });
   }
 },
  /**
   * Mettre à jour un email
   * @route PUT /api/emails/:id
   */
  updateEmail: async (req, res) => {
    try {
      const { id } = req.params;
      const emailKey = encodeEmailKey(req.user.email);
      const {
        subject,
        body,
        recipients,
        labels,
        isDraft
      } = req.body;
      
      // Vérifier que l'email existe
      const email = await Email.findById(id);
      
      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Email non trouvé'
        });
      }
      
      // Vérifier que l'utilisateur est l'expéditeur
      if (email.sender.email !== req.user.email) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à modifier cet email'
        });
      }
      
      // Mettre à jour les champs
      if (subject) email.subject = subject;
      if (body) email.body = body;
      if (recipients) {
        email.recipients = recipients;
        // Mettre à jour le userEmailStatus pour les nouveaux destinataires
        [...recipients.to, ...recipients.cc, ...recipients.bcc].forEach(r => {
          const recipientKey = encodeEmailKey(r.email);
          if (!email.userEmailStatus.has(recipientKey)) {
            email.userEmailStatus.set(recipientKey, {});
          }
        });
        
        // Mettre à jour le thread pour inclure les nouveaux participants
        if (email.threadId) {
          const thread = await Thread.findById(email.threadId);
          if (thread) {
            // Mettre à jour les destinataires du thread
            [...recipients.to, ...recipients.cc, ...recipients.bcc].forEach(r => {
              const recipientKey = encodeEmailKey(r.email);
              if (r.userId) {
                thread.participants.addToSet(r.userId);
              }
              if (!thread.userThreadStatus.has(recipientKey)) {
                thread.userThreadStatus.set(recipientKey, {});
              }
            });
            await thread.save();
          }
        }
      }
      if (labels) email.labels = labels;
      if (isDraft !== undefined) email.isDraft = isDraft;
      
      // Si l'email n'est plus un brouillon, mettre à jour la date d'envoi
      if (email.isDraft && isDraft === false) {
        email.sentAt = new Date();
        
        // Mettre à jour la date du dernier message dans le thread
        if (email.threadId) {
          await Thread.findByIdAndUpdate(email.threadId, {
            lastMessageAt: new Date()
          });
        }
      }
      
      const updatedEmail = await email.save();
      
      res.status(200).json({
        success: true,
        data: updatedEmail
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Ajouter ou retirer un label à un email
   * @route PATCH /api/emails/:id/labels/:labelId
   */
  toggleLabel: async (req, res) => {
    try {
      const { id, labelId } = req.params;
      const emailKey = encodeEmailKey(req.user.email);
      const { action } = req.body; // 'add' ou 'remove'
      
      const email = await Email.findById(id);
      
      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Email non trouvé'
        });
      }
      
      // Vérifier l'accès à l'email
      if (!email.userEmailStatus.has(emailKey)) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé à cet email'
        });
      }
      
      if (action === 'add') {
        // Vérifier si le label existe déjà
        if (!email.labels.includes(labelId)) {
          email.labels.push(labelId);
        }
      } else if (action === 'remove') {
        // Filtrer pour retirer le label
        email.labels = email.labels.filter(
          label => label.toString() !== labelId
        );
      }
      
      const updatedEmail = await email.save();
      
      // Mettre à jour également les labels du thread
      if (email.threadId) {
        const thread = await Thread.findById(email.threadId);
        if (thread) {
          if (action === 'add' && !thread.labels.includes(labelId)) {
            thread.labels.push(labelId);
          } else if (action === 'remove') {
            thread.labels = thread.labels.filter(
              label => label.toString() !== labelId
            );
          }
          await thread.save();
        }
      }
      
      res.status(200).json({
        success: true,
        data: updatedEmail.labels
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * Obtenir les statistiques des emails de l'utilisateur
   * @route GET /api/emails/stats
   */
  getEmailStats: async (req, res) => {
    try {
      const emailKey = encodeEmailKey(req.user.email);
      
      // Comptage pour différentes catégories
      const stats = {
        inbox: await Email.countDocuments({ 
          $or: [
            { 'recipients.to.email': req.user.email },
            { 'recipients.cc.email': req.user.email },
            { 'recipients.bcc.email': req.user.email }
          ],
          isDraft: false,
          [`userEmailStatus.${emailKey}.isDeleted`]: { $ne: true }
        }),
        unread: await Email.countDocuments({ 
          $or: [
            { 'recipients.to.email': req.user.email },
            { 'recipients.cc.email': req.user.email },
            { 'recipients.bcc.email': req.user.email }
          ],
          isDraft: false,
          [`userEmailStatus.${emailKey}.isRead`]: false,
          [`userEmailStatus.${emailKey}.isDeleted`]: { $ne: true }
        }),
        sent: await Email.countDocuments({ 
          'sender.email': req.user.email,
          isDraft: false,
          [`userEmailStatus.${emailKey}.isDeleted`]: { $ne: true }
        }),
        drafts: await Email.countDocuments({ 
          'sender.email': req.user.email,
          isDraft: true,
          [`userEmailStatus.${emailKey}.isDeleted`]: { $ne: true }
        }),
        archived: await Email.countDocuments({
          [`userEmailStatus.${emailKey}.isArchived`]: true,
          [`userEmailStatus.${emailKey}.isDeleted`]: { $ne: true }
        }),
        trash: await Email.countDocuments({
          [`userEmailStatus.${emailKey}.isDeleted`]: true
        }),
        important: await Email.countDocuments({
          [`userEmailStatus.${emailKey}.isImportant`]: true,
          [`userEmailStatus.${emailKey}.isDeleted`]: { $ne: true }
        })
      };
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },
moveToTrash: async (req, res) => {
  try {
    const { id } = req.params;
    const emailKey = encodeEmailKey(req.user.email);
    
    const mail = await Email.findById(id);
    if (!mail) return res.status(404).json({ success: false });
    
    // Marquer comme supprimé pour cet utilisateur
    if (!mail.userEmailStatus.has(emailKey)) {
      mail.userEmailStatus.set(emailKey, {});
    }
    mail.userEmailStatus.get(emailKey).isDeleted = true;
    
    // Mettre à jour également l'état du thread
    const thread = await Thread.findById(mail.threadId);
    if (thread) {
      if (!thread.userThreadStatus.has(emailKey)) {
        thread.userThreadStatus.set(emailKey, {});
      }
      thread.userThreadStatus.get(emailKey).isDeleted = true;
      await thread.save();
    }
    
    await mail.save();
    res.json({ success: true, message: 'Déplacé vers la corbeille' });
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
},
filterEmailsByLabel: async (req, res) => {
    try {
      const { labelId } = req.query;
      const email = req.user.email;
      const emailKey = encodeEmailKey(email);


      if (!labelId) {
        return res.status(400).json({
          success: false,
          message: 'ID de label requis'
        });
      }


      // Importer le modèle Label
      const Label = require('../models/Label');


      // Trouver le label pour obtenir les emails associés
      const label = await Label.findById(labelId);
      if (!label) {
        return res.status(404).json({
          success: false,
          message: 'Label non trouvé'
        });
      }


      let query = {
        [`userEmailStatus.${emailKey}.isDeleted`]: { $ne: true }
      };


      // Si c'est un label de type email, filtrer par expéditeur
      if (label.type === 'email') {
        query['sender.email'] = { $in: label.associatedEmails };
      }


      const emails = await Email.find(query)
        .sort({ createdAt: -1 })
        .populate('labels', 'name color')
        .populate('threadId', 'subject');


      res.status(200).json({
        success: true,
        count: emails.length,
        data: emails
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};


module.exports = emailController;


