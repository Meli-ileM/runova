// // services/emailEncryptionService.js
// const crypto = require('crypto');
// const User = require('../models/User');
// const cryptoService = require('../utils/cryptoService');

// const algorithm = 'aes-256-cbc';
// const ivLength = 16;

// /**
//  * Service to handle email encryption and decryption
//  */
// class EmailEncryptionService {
//   /**
//    * Encrypts an email for all recipients
//    * @param {Object} emailData - The email data to be encrypted
//    * @param {String} emailData.body - The email body content
//    * @param {String} emailData.subject - The email subject
//    * @param {Array} emailData.attachments - The email attachments
//    * @param {Object} recipients - All recipients (to, cc, bcc)
//    * @param {Object} sender - The sender user object
//    * @returns {Object} - The encrypted email data
//    */
//   async encryptEmail(emailData, recipients, sender) {
//     try {
//       // 1. Generate a random symmetric key for this email
//       const symmetricKey = crypto.randomBytes(32); // 256 bits for AES-256
//       const iv = crypto.randomBytes(ivLength);
      
//       // 2. Encrypt the email body with this symmetric key
//       const encryptedBody = this.encryptWithSymmetricKey(emailData.body, symmetricKey, iv);
      
//       // 3. Encrypt the email subject
//       const encryptedSubject = this.encryptWithSymmetricKey(emailData.subject, symmetricKey, iv);
      
//       // 4. Encrypt attachments if any
//       const encryptedAttachments = (emailData.attachments || []).map(attachment => {
//         // In a real implementation, you would read the file content and encrypt it
//         const encryptedData = this.encryptWithSymmetricKey(
//           attachment.data || attachment.url || JSON.stringify(attachment), 
//           symmetricKey, 
//           iv
//         );
        
//         return {
//           name: attachment.name,
//           data: encryptedData,
//           type: attachment.type,
//           size: attachment.size,
//           isEncrypted: true
//         };
//       });
      
//       // 5. Get the sender's user document to access contacts
//       const senderUser = await User.findOne({ email: sender.email });
//       if (!senderUser) {
//         throw new Error('Sender user not found');
//       }
      
//       // 6. Get all recipient emails
//       const allRecipients = [
//         ...recipients.to || [],
//         ...recipients.cc || [],
//         ...recipients.bcc || []
//       ];
//       const recipientEmails = allRecipients.map(r => r.email);
      
//       // 7. Initialize the encryptedSymKey object
//       const encryptedSymKey = {};
      
//       // 8. First, encrypt for the sender (so they can read their sent messages)
//       if (senderUser.publicKey && senderUser.keysGenerated) {
//         try {
//           // Combine symmetric key and IV for encryption
//           const keyWithIv = Buffer.concat([symmetricKey, iv]).toString('hex');
          
//           // Encrypt with sender's public key
//           const encryptedKey = crypto.publicEncrypt(
//             {
//               key: senderUser.publicKey,
//               padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
//             },
//             Buffer.from(keyWithIv, 'hex')
//           ).toString('base64');
          
//           // Store the encrypted key
//           encryptedSymKey[senderUser.email] = encryptedKey;
//           console.log(`Symmetric key encrypted for sender ${senderUser.email}`);
//         } catch (error) {
//           console.error(`Failed to encrypt symmetric key for sender ${senderUser.email}: ${error.message}`);
//         }
//       }
      
//       // 9. Then encrypt for recipients that are in the sender's contacts
//       // For each recipient, check if they are in the sender's contacts list
//       for (const recipientEmail of recipientEmails) {
//         // Skip if it's the sender (already handled)
//         if (recipientEmail === senderUser.email) continue;
        
//         // Find contact in sender's contacts list
//         const contactEntry = senderUser.contacts.find(contact => 
//           contact.email === recipientEmail && contact.publicKey);
        
//         if (contactEntry && contactEntry.publicKey) {
//           try {
//             // Combine symmetric key and IV for encryption
//             const keyWithIv = Buffer.concat([symmetricKey, iv]).toString('hex');
            
//             // Encrypt with contact's public key
//             const encryptedKey = crypto.publicEncrypt(
//               {
//                 key: contactEntry.publicKey,
//                 padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
//               },
//               Buffer.from(keyWithIv, 'hex')
//             ).toString('base64');
            
//             // Store the encrypted key
//             encryptedSymKey[recipientEmail] = encryptedKey;
//             console.log(`Symmetric key encrypted for contact ${recipientEmail}`);
//           } catch (error) {
//             console.error(`Failed to encrypt symmetric key for contact ${recipientEmail}: ${error.message}`);
//           }
//         } else {
//           console.log(`Recipient ${recipientEmail} is not in sender's contacts or has no public key shared`);
//         }
//       }
      
//       // 10. Return the encrypted email data
//       return {
//         body: encryptedBody,
//         subject: encryptedSubject,
//         attachments: encryptedAttachments,
//         isEncrypted: true,
//         encryptedSymKey: encryptedSymKey
//       };
//     } catch (error) {
//       console.error('Email encryption failed:', error);
//       throw new Error('Failed to encrypt email: ' + error.message);
//     }
//   }
  
//   /**
//    * Decrypts an email for a specific user
//    * @param {Object} encryptedEmail - The encrypted email
//    * @param {String} userEmail - The email of the user trying to decrypt
//    * @param {String} password - The password to decrypt the user's private key
//    * @returns {Object} - The decrypted email data
//    */
//   async decryptEmail(encryptedEmail, userEmail, password) {
//     try {
//       // 1. Validate input parameters
//       if (!encryptedEmail || !userEmail) {
//         throw new Error('Missing required parameters: encryptedEmail or userEmail');
//       }

//       // Check if password is provided
//       if (!password) {
//         throw new Error('Password is required for decryption');
//       }
      
//       // 2. Check if the email is encrypted and if the user has an encrypted symmetric key
//       if (!encryptedEmail.isEncrypted || !encryptedEmail.encryptedSymKey || 
//           !encryptedEmail.encryptedSymKey[userEmail]) {
//         throw new Error('This encrypted email cannot be decrypted by this user');
//       }
      
//       // 3. Get the user's encrypted private key
//       const user = await User.findOne({ email: userEmail });
//       if (!user || !user.encryptedPrivateKey) {
//         throw new Error('User or private key not found');
//       }
      
//       // 4. Verify the private key format before attempting to decrypt
//       if (!user.encryptedPrivateKey.includes('.')) {
//         throw new Error('Invalid private key format: expected format with dot separators');
//       }
      
//       // 5. Decrypt the private key using the password
//       const privateKey = cryptoService.decryptPrivateKey(user.encryptedPrivateKey, password);
      
//       // 6. Decrypt the symmetric key using the private key
//       const encryptedSymKey = encryptedEmail.encryptedSymKey[userEmail];
//       const keyWithIv = crypto.privateDecrypt(
//         {
//           key: privateKey,
//           padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
//         },
//         Buffer.from(encryptedSymKey, 'base64')
//       ).toString('hex');
      
//       // 7. Extract symmetric key and IV
//       const symmetricKey = Buffer.from(keyWithIv.substring(0, 64), 'hex');
//       const iv = Buffer.from(keyWithIv.substring(64), 'hex');
      
//       // 8. Decrypt the email content (body, subject, attachments)
//       let result = {};
      
//       // Decrypt body if present
//       if (encryptedEmail.body) {
//         result.body = this.decryptWithSymmetricKey(encryptedEmail.body, symmetricKey, iv);
//       }
      
//       // Decrypt subject if present
//       if (encryptedEmail.subject) {
//         result.subject = this.decryptWithSymmetricKey(encryptedEmail.subject, symmetricKey, iv);
//       }
      
//       // 9. Decrypt attachments if any
//       if (encryptedEmail.attachments && encryptedEmail.attachments.length > 0) {
//         result.attachments = encryptedEmail.attachments.map(attachment => {
//           if (attachment.isEncrypted && attachment.data) {
//             // Decrypt the attachment data
//             const decryptedData = this.decryptWithSymmetricKey(attachment.data, symmetricKey, iv);
            
//             return {
//               ...attachment,
//               data: decryptedData,
//               isEncrypted: false
//             };
//           }
//           return attachment;
//         });
//       }
      
//       // 10. Return the decrypted email data
//       return result;
//     } catch (error) {
//       console.error('Email decryption failed:', error);
//       throw new Error('Failed to decrypt email: ' + error.message);
//     }
//   }
  
//   /**
//    * Encrypt content with a symmetric key
//    * @param {String} content - The content to encrypt
//    * @param {Buffer} key - The symmetric key
//    * @param {Buffer} iv - The initialization vector
//    * @returns {String} - The encrypted content
//    */
//   encryptWithSymmetricKey(content, key, iv) {
//     const cipher = crypto.createCipheriv(algorithm, key, iv);
//     let encrypted = cipher.update(content, 'utf8', 'hex');
//     encrypted += cipher.final('hex');
    
//     // Store IV with the encrypted content
//     return iv.toString('hex') + ':' + encrypted;
//   }
  
//   /**
//    * Decrypt content with a symmetric key
//    * @param {String} encryptedContent - The encrypted content
//    * @param {Buffer} key - The symmetric key
//    * @param {Buffer} iv - The initialization vector
//    * @returns {String} - The decrypted content
//    */
//   decryptWithSymmetricKey(encryptedContent, key, iv) {
//     // Extract IV and encrypted content
//     const parts = encryptedContent.split(':');
//     if (parts.length !== 2) {
//       throw new Error('Invalid encrypted content format');
//     }
    
//     // For this function we receive the IV separately, but we should validate they match
//     const contentIv = Buffer.from(parts[0], 'hex');
//     if (!contentIv.equals(iv)) {
//       console.warn('IV mismatch, using provided IV');
//     }
    
//     const encrypted = parts[1];
    
//     // Decrypt
//     const decipher = crypto.createDecipheriv(algorithm, key, iv);
//     let decrypted = decipher.update(encrypted, 'hex', 'utf8');
//     decrypted += decipher.final('utf8');
    
//     return decrypted;
//   }
// }

// module.exports = new EmailEncryptionService();
const crypto = require('crypto');
const User = require('../models/User');
const cryptoService = require('../utils/cryptoService');

const algorithm = 'aes-256-cbc';
const ivLength = 16;

class EmailEncryptionService {
  /**
   * Chiffre un email pour tous les destinataires
   */
  async encryptEmail(emailData, recipients, sender) {
    try {
      console.log('🔐 Début du chiffrement de l\'email...');
      
      // 1. Génération d'une clé symétrique aléatoire
      const symmetricKey = crypto.randomBytes(32); // 256 bits pour AES-256
      const iv = crypto.randomBytes(ivLength);
      
      console.log(`📧 Chiffrement du contenu de l'email...`);
      
      // 2. Chiffrement du corps de l'email
      const encryptedBody = this.encryptWithSymmetricKey(emailData.body, symmetricKey, iv);
      
      // 3. Chiffrement du sujet
      const encryptedSubject = this.encryptWithSymmetricKey(emailData.subject, symmetricKey, iv);
      
      // 4. Chiffrement des pièces jointes (simplifié)
      console.log(`📎 Chiffrement de ${emailData.attachments?.length || 0} pièce(s) jointe(s)...`);
      const encryptedAttachments = this.encryptAttachmentsSimple(emailData.attachments || [], symmetricKey, iv);
      
      // 5. Récupération de l'utilisateur expéditeur
      const senderUser = await User.findOne({ email: sender.email });
      if (!senderUser) {
        throw new Error('Utilisateur expéditeur non trouvé');
      }
      
      // 6. Collecte de tous les emails des destinataires
      const allRecipients = [
        ...recipients.to || [],
        ...recipients.cc || [],
        ...recipients.bcc || []
      ];
      const recipientEmails = allRecipients.map(r => r.email);
      
      console.log(`👥 Chiffrement pour ${recipientEmails.length + 1} utilisateur(s)...`);
      
      // 7. Chiffrement de la clé symétrique pour tous les utilisateurs autorisés
      const encryptedSymKey = await this.encryptSymmetricKeyForUsers(
        symmetricKey, iv, senderUser, recipientEmails
      );
      
      console.log('✅ Email chiffré avec succès !');
      
      // 8. Retour des données chiffrées
      return {
        body: encryptedBody,
        subject: encryptedSubject,
        attachments: encryptedAttachments,
        isEncrypted: true,
        encryptedSymKey: encryptedSymKey,
        encryptionTimestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Échec du chiffrement de l\'email:', error);
      throw new Error('Échec du chiffrement de l\'email: ' + error.message);
    }
  }

encryptAttachmentsSimple(attachments, symmetricKey, iv) {
  const encryptedAttachments = [];
  
  for (let i = 0; i < attachments.length; i++) {
    const attachment = attachments[i];
    
    try {
      console.log(`📎 [${i + 1}/${attachments.length}] Chiffrement: ${attachment.name}`);
      
      // Vérification des données d'entrée
      if (!attachment.data || attachment.error) {
        console.log(`⚠️ Pas de données valides pour ${attachment.name}`);
        encryptedAttachments.push({
          ...attachment,
          isEncrypted: false,
          encryptionStatus: 'skipped',
          error: attachment.error || 'Aucune donnée à chiffrer'
        });
        continue;
      }

      let dataToEncrypt;
      
      // CORRECTION MAJEURE : Traitement correct des données base64
      if (typeof attachment.data === 'string') {
        try {
          // IMPORTANT: Les données viennent maintenant en base64 pur (sans préfixe)
          dataToEncrypt = Buffer.from(attachment.data, 'base64');
          console.log(`📊 Données décodées: ${dataToEncrypt.length} bytes pour ${attachment.name}`);
          
          // Validation que le décodage a fonctionné
          if (dataToEncrypt.length === 0) {
            throw new Error('Décodage base64 a produit des données vides');
          }
          
        } catch (decodeError) {
          console.error(`❌ Erreur décodage base64 pour ${attachment.name}:`, decodeError);
          throw new Error(`Erreur décodage base64: ${decodeError.message}`);
        }
      } else if (Buffer.isBuffer(attachment.data)) {
        dataToEncrypt = attachment.data;
      } else {
        // Pour tout autre type, convertir en JSON puis en Buffer
        dataToEncrypt = Buffer.from(JSON.stringify(attachment.data), 'utf8');
      }

      // Validation finale de la taille
      if (dataToEncrypt.length === 0) {
        throw new Error('Données vides après traitement');
      }

      // Chiffrement avec un IV unique pour chaque pièce jointe
      const attachmentIv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', symmetricKey, attachmentIv);
      const encrypted = Buffer.concat([cipher.update(dataToEncrypt), cipher.final()]);
      
      // Format: IV:données_chiffrées (en base64)
      const encryptedData = attachmentIv.toString('hex') + ':' + encrypted.toString('base64');
      
      encryptedAttachments.push({
        name: attachment.name,
        data: encryptedData,
        type: attachment.type,
        size: encryptedData.length,
        originalSize: dataToEncrypt.length,
        isEncrypted: true,
        encryptionStatus: 'success'
      });
      
      console.log(`✅ ${attachment.name} chiffré: ${dataToEncrypt.length} -> ${encryptedData.length} caractères`);
      
    } catch (error) {
      console.error(`❌ Erreur chiffrement ${attachment.name}:`, error.message);
      encryptedAttachments.push({
        name: attachment.name,
        data: attachment.data,
        type: attachment.type,
        size: attachment.size,
        isEncrypted: false,
        error: error.message,
        encryptionStatus: 'error'
      });
    }
  }
  
  const successCount = encryptedAttachments.filter(a => a.encryptionStatus === 'success').length;
  console.log(`📊 ${successCount}/${attachments.length} pièces jointes chiffrées avec succès`);
  
  return encryptedAttachments;
}

/**
 * CORRECTION : Déchiffrement des pièces jointes
 */
decryptAttachmentsSimple(encryptedAttachments, symmetricKey, iv) {
  const decryptedAttachments = [];
  
  for (let i = 0; i < encryptedAttachments.length; i++) {
    const attachment = encryptedAttachments[i];
    
    try {
      if (attachment.isEncrypted && attachment.data && attachment.encryptionStatus === 'success') {
        console.log(`📎 [${i + 1}/${encryptedAttachments.length}] Déchiffrement: ${attachment.name}`);
        
        try {
          // Parsing du format IV:données_chiffrées
          const parts = attachment.data.split(':');
          if (parts.length !== 2) {
            throw new Error('Format de données chiffrées invalide');
          }
          
          const attachmentIv = Buffer.from(parts[0], 'hex');
          const encryptedBuffer = Buffer.from(parts[1], 'base64');
          
          // Validation des tailles
          if (attachmentIv.length !== 16) {
            throw new Error('IV invalide');
          }
          if (encryptedBuffer.length === 0) {
            throw new Error('Données chiffrées vides');
          }
          
          // Déchiffrement
          const decipher = crypto.createDecipheriv('aes-256-cbc', symmetricKey, attachmentIv);
          const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
          
          // Validation du résultat
          if (decryptedBuffer.length === 0) {
            throw new Error('Déchiffrement a produit des données vides');
          }
          
          // Retourner en base64 pur pour le frontend
          const finalData = decryptedBuffer.toString('base64');
          
          decryptedAttachments.push({
            name: attachment.name,
            data: finalData,
            type: attachment.type,
            size: decryptedBuffer.length,
            originalSize: attachment.originalSize,
            isEncrypted: false,
            decryptionStatus: 'success'
          });
          
          console.log(`✅ ${attachment.name} déchiffré: ${attachment.size} caractères -> ${decryptedBuffer.length} bytes`);
          
        } catch (decryptError) {
          console.error(`❌ Erreur déchiffrement ${attachment.name}:`, decryptError.message);
          decryptedAttachments.push({
            name: attachment.name,
            data: null,
            type: attachment.type,
            size: 0,
            isEncrypted: false,
            decryptionStatus: 'error',
            error: `Erreur de déchiffrement: ${decryptError.message}`
          });
        }
        
      } else {
        // Pièce jointe non chiffrée
        console.log(`📎 ${attachment.name} non chiffré, copie directe`);
        decryptedAttachments.push({
          name: attachment.name || 'inconnu',
          data: attachment.data,
          type: attachment.type || 'inconnu',
          size: attachment.size || 0,
          isEncrypted: false,
          decryptionStatus: attachment.error ? 'error' : 'unencrypted',
          error: attachment.error
        });
      }
    } catch (error) {
      console.error(`❌ Erreur générale déchiffrement ${attachment.name}:`, error.message);
      decryptedAttachments.push({
        name: attachment.name || 'inconnu',
        data: null,
        type: attachment.type || 'inconnu',
        size: 0,
        isEncrypted: false,
        decryptionStatus: 'error',
        error: error.message
      });
    }
  }
  
  const successCount = decryptedAttachments.filter(a => 
    a.decryptionStatus === 'success' || a.decryptionStatus === 'unencrypted'
  ).length;
  console.log(`📊 ${successCount}/${encryptedAttachments.length} pièces jointes traitées avec succès`);
  
  return decryptedAttachments;
}

  /**
   * Chiffre un Buffer avec la clé symétrique
   */
  encryptBuffer(buffer, key, iv) {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('base64');
  }

  /**
   * Déchiffre un email pour un utilisateur spécifique
   */
  async decryptEmail(encryptedEmail, userEmail, password) {
    try {
      console.log(`🔓 Début du déchiffrement pour ${userEmail}...`);
      
      // Validation des paramètres d'entrée
      if (!encryptedEmail || !userEmail || !password) {
        throw new Error('Paramètres requis manquants');
      }
      
      // Vérification que l'email peut être déchiffré par cet utilisateur
      if (!encryptedEmail.isEncrypted || !encryptedEmail.encryptedSymKey || 
          !encryptedEmail.encryptedSymKey[userEmail]) {
        throw new Error('Cet email chiffré ne peut pas être déchiffré par cet utilisateur');
      }
      
      // Récupération de la clé privée de l'utilisateur
      const user = await User.findOne({ email: userEmail });
      if (!user || !user.encryptedPrivateKey) {
        throw new Error('Utilisateur ou clé privée non trouvés');
      }
      
      // Déchiffrement de la clé privée
      const privateKey = cryptoService.decryptPrivateKey(user.encryptedPrivateKey, password);
      
      // Déchiffrement de la clé symétrique
      const encryptedSymKey = encryptedEmail.encryptedSymKey[userEmail];
      const keyWithIv = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        Buffer.from(encryptedSymKey, 'base64')
      ).toString('hex');
      
      // Extraction de la clé symétrique et de l'IV
      const symmetricKey = Buffer.from(keyWithIv.substring(0, 64), 'hex');
      const iv = Buffer.from(keyWithIv.substring(64), 'hex');
      
      console.log('🔓 Déchiffrement du contenu de l\'email...');
      
      // Déchiffrement du contenu de l'email
      let result = {};
      
      if (encryptedEmail.body) {
        result.body = this.decryptWithSymmetricKey(encryptedEmail.body, symmetricKey, iv);
      }
      
      if (encryptedEmail.subject) {
        result.subject = this.decryptWithSymmetricKey(encryptedEmail.subject, symmetricKey, iv);
      }
      
      // Déchiffrement des pièces jointes (simplifié)
      if (encryptedEmail.attachments && encryptedEmail.attachments.length > 0) {
        console.log(`📎 Déchiffrement de ${encryptedEmail.attachments.length} pièce(s) jointe(s)...`);
        result.attachments = this.decryptAttachmentsSimple(encryptedEmail.attachments, symmetricKey, iv);
      }
      
      console.log('✅ Email déchiffré avec succès !');
      return result;
    } catch (error) {
      console.error('❌ Échec du déchiffrement de l\'email:', error);
      throw new Error('Échec du déchiffrement de l\'email: ' + error.message);
    }
  }

  /**
   * Chiffre la clé symétrique pour les utilisateurs autorisés
   */
  async encryptSymmetricKeyForUsers(symmetricKey, iv, senderUser, recipientEmails) {
    const encryptedSymKey = {};
    let successCount = 0;
    let errorCount = 0;
    
    // Chiffrement pour l'expéditeur
    if (senderUser.publicKey && senderUser.keysGenerated) {
      try {
        const keyWithIv = Buffer.concat([symmetricKey, iv]).toString('hex');
        const encryptedKey = crypto.publicEncrypt(
          {
            key: senderUser.publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
          },
          Buffer.from(keyWithIv, 'hex')
        ).toString('base64');
        
        encryptedSymKey[senderUser.email] = encryptedKey;
        successCount++;
        console.log(`🔑 Clé chiffrée pour l'expéditeur ${senderUser.email}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Échec du chiffrement de clé pour l'expéditeur: ${error.message}`);
      }
    }
    
    // Chiffrement pour les destinataires
    for (const recipientEmail of recipientEmails) {
      if (recipientEmail === senderUser.email) continue;
      
      const contactEntry = senderUser.contacts.find(contact => 
        contact.email === recipientEmail && contact.publicKey);
      
      if (contactEntry && contactEntry.publicKey) {
        try {
          const keyWithIv = Buffer.concat([symmetricKey, iv]).toString('hex');
          const encryptedKey = crypto.publicEncrypt(
            {
              key: contactEntry.publicKey,
              padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
            },
            Buffer.from(keyWithIv, 'hex')
          ).toString('base64');
          
          encryptedSymKey[recipientEmail] = encryptedKey;
          successCount++;
          console.log(`🔑 Clé chiffrée pour le contact ${recipientEmail}`);
        } catch (error) {
          errorCount++;
          console.error(`❌ Échec du chiffrement de clé pour ${recipientEmail}: ${error.message}`);
        }
      } else {
        errorCount++;
        console.log(`⚠️ Destinataire ${recipientEmail} absent des contacts ou sans clé publique`);
      }
    }
    
    console.log(`📊 Chiffrement des clés: ${successCount} réussis, ${errorCount} échecs`);
    
    if (successCount === 0) {
      throw new Error('Aucune clé n\'a pu être chiffrée pour les destinataires');
    }
    
    return encryptedSymKey;
  }

  /**
   * Chiffre le contenu avec une clé symétrique (pour le contenu texte)
   */
  encryptWithSymmetricKey(content, key, iv) {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Déchiffre le contenu avec une clé symétrique (pour le contenu texte)
   */
  decryptWithSymmetricKey(encryptedContent, key, iv) {
    const parts = encryptedContent.split(':');
    if (parts.length !== 2) {
      throw new Error('Format de contenu chiffré invalide');
    }
    
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

module.exports = new EmailEncryptionService();