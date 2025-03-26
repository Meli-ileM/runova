// utils/cryptoEmailService.js

/**
 * Service de chiffrement pour les emails
 * Ce service étend cryptoService.js existant avec des fonctions spécifiques aux emails
 */

class CryptoEmailService {
  constructor() {
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
  }

  /**
   * Chiffre un email pour un destinataire spécifique
   * @param {Object} emailContent - Contenu de l'email à chiffrer
   * @param {String} recipientPublicKey - Clé publique du destinataire au format PEM
   * @returns {Object} - Contenu chiffré
   */
  async encryptEmailForRecipient(emailContent, recipientPublicKey) {
      console.log("Début du chiffrement pour:", recipientPublicKey); // Debug

    try {
      // Convertir la clé publique du destinataire du format PEM vers un format utilisable
      const publicKeyObj = await this.importPublicKey(recipientPublicKey);
      
      // Générer une clé AES aléatoire pour le chiffrement symétrique du contenu
      const aesKey = await window.crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256
        },
        true,
        ["encrypt", "decrypt"]
      );
      
      // Chiffrer le contenu de l'email avec la clé AES
      const contentJson = JSON.stringify(emailContent);
      const contentBuffer = this.encoder.encode(contentJson);
      
      // Générer un vecteur d'initialisation aléatoire pour AES-GCM
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      // Chiffrer le contenu avec AES
      const encryptedContent = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        aesKey,
        contentBuffer
      );
      
      // Exporter la clé AES pour la chiffrer avec la clé publique du destinataire
      const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
      
      // Chiffrer la clé AES avec la clé publique RSA du destinataire
      const encryptedKey = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP"
        },
        publicKeyObj,
        exportedAesKey
      );
      
      // Convertir les données binaires en format base64 pour le stockage/transfert
      const encryptedContentBase64 = this.arrayBufferToBase64(encryptedContent);
      const encryptedKeyBase64 = this.arrayBufferToBase64(encryptedKey);
      const ivBase64 = this.arrayBufferToBase64(iv);
      
      // Retourner les données chiffrées
      return {
        encryptedContent: encryptedContentBase64,
        encryptedKey: encryptedKeyBase64,
        iv: ivBase64
      };
          console.log("Chiffrement réussi"); // Debug

    } catch (error) {
      console.error("Erreur lors du chiffrement de l'email:", error);
      throw new Error("Échec du chiffrement de l'email");
    }
  }
  
  /**
   * Déchiffre un email avec la clé privée de l'utilisateur
   * @param {Object} encryptedData - Données chiffrées de l'email
   * @param {String} privateKeyPEM - Clé privée de l'utilisateur au format PEM
   * @param {String} password - Mot de passe pour déchiffrer la clé privée
   * @returns {Object} - Contenu déchiffré de l'email
   */
  async decryptEmail(encryptedData, privateKeyPEM, password) {
    try {
      // Déchiffrer la clé privée avec le mot de passe
      const privateKey = await this.decryptPrivateKey(privateKeyPEM, password);
      
      // Convertir les données de base64 vers ArrayBuffer
      const encryptedKey = this.base64ToArrayBuffer(encryptedData.encryptedKey);
      const encryptedContent = this.base64ToArrayBuffer(encryptedData.encryptedContent);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      
      // Déchiffrer la clé AES avec la clé privée
      const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
        {
          name: "RSA-OAEP"
        },
        privateKey,
        encryptedKey
      );
      
      // Importer la clé AES déchiffrée
      const aesKey = await window.crypto.subtle.importKey(
        "raw",
        decryptedKeyBuffer,
        {
          name: "AES-GCM",
          length: 256
        },
        false,
        ["decrypt"]
      );
      
      // Déchiffrer le contenu avec la clé AES
      const decryptedContent = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        aesKey,
        encryptedContent
      );
      
      // Convertir le contenu déchiffré en texte
      const decryptedText = this.decoder.decode(decryptedContent);
      
      // Parser le JSON
      return JSON.parse(decryptedText);
    } catch (error) {
      console.error("Erreur lors du déchiffrement de l'email:", error);
      throw new Error("Échec du déchiffrement de l'email");
    }
  }
  
  /**
   * Déchiffre la clé privée avec le mot de passe
   * @param {String} encryptedPrivateKeyPEM - Clé privée chiffrée au format PEM
   * @param {String} password - Mot de passe pour déchiffrer la clé
   * @returns {CryptoKey} - Objet CryptoKey représentant la clé privée
   */
  async decryptPrivateKey(encryptedPrivateKeyPEM, password) {
    try {
      // Extraire les données chiffrées et le sel du format PEM
      const base64Data = encryptedPrivateKeyPEM
        .replace(/-----BEGIN ENCRYPTED PRIVATE KEY-----/, '')
        .replace(/-----END ENCRYPTED PRIVATE KEY-----/, '')
        .replace(/\n/g, '');
      
      // Décoder le format personnalisé pour extraire sel et données
      const [saltBase64, encryptedKeyBase64] = base64Data.split('.');
      const salt = this.base64ToArrayBuffer(saltBase64);
      const encryptedKey = this.base64ToArrayBuffer(encryptedKeyBase64);
      
      // Dériver la clé de déchiffrement à partir du mot de passe
      const passwordBuffer = this.encoder.encode(password);
      const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );
      
      const derivedKey = await window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: 100000,
          hash: "SHA-256"
        },
        keyMaterial,
        {
          name: "AES-GCM",
          length: 256
        },
        false,
        ["decrypt"]
      );
      
      // Séparer le vecteur d'initialisation du reste des données chiffrées
      const iv = new Uint8Array(encryptedKey, 0, 12);
      const encryptedPrivateKeyData = new Uint8Array(encryptedKey, 12);
      
      // Déchiffrer la clé privée
      const decryptedPrivateKey = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        derivedKey,
        encryptedPrivateKeyData
      );
      
      // Importer la clé privée déchiffrée
      return await window.crypto.subtle.importKey(
        "pkcs8",
        decryptedPrivateKey,
        {
          name: "RSA-OAEP",
          hash: "SHA-256"
        },
        false,
        ["decrypt"]
      );
    } catch (error) {
      console.error("Erreur lors du déchiffrement de la clé privée:", error);
      throw new Error("Échec du déchiffrement de la clé privée");
    }
  }
  
  /**
   * Importe une clé publique à partir d'un format PEM
   * @param {String} publicKeyPEM - Clé publique au format PEM
   * @returns {CryptoKey} - Objet CryptoKey représentant la clé publique
   */
  async importPublicKey(publicKeyPEM) {
    try {
      // Extraire les données du format PEM
      const pemContents = publicKeyPEM
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\n/g, '');
      
      // Convertir la clé base64 en ArrayBuffer
      const binaryDer = this.base64ToArrayBuffer(pemContents);
      
      // Importer la clé publique
      return await window.crypto.subtle.importKey(
        "spki",
        binaryDer,
        {
          name: "RSA-OAEP",
          hash: "SHA-256"
        },
        true,
        ["encrypt"]
      );
    } catch (error) {
      console.error("Erreur lors de l'importation de la clé publique:", error);
      throw new Error("Échec de l'importation de la clé publique");
    }
  }
  
  // Fonctions utilitaires pour la conversion entre ArrayBuffer et Base64
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export default new CryptoEmailService();