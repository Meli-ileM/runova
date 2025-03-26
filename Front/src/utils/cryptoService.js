// Client-side cryptoService.js
const CryptoService = {
  /**
   * Génère les clés de l'utilisateur et chiffre la clé privée avec le mot de passe
   * @param {String} email - Email de l'utilisateur
   * @param {String} password - Mot de passe de l'utilisateur
   * @returns {Object} - Clé publique et clé privée chiffrée
   */
  generateUserKeys: async (email, password) => {
    try {
      console.log("Début de la génération des clés...");
      
      // Générer une paire de clés RSA
      const { publicKey, privateKey } = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
          hash: { name: "SHA-256" }
        },
        true, // extractable
        ["encrypt", "decrypt"]
      );
      
      // Exporter la clé publique au format PEM
      const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", publicKey);
      const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
      const formattedPublicKey = 
        "-----BEGIN PUBLIC KEY-----\n" +
        publicKeyBase64.match(/.{1,64}/g).join("\n") +
        "\n-----END PUBLIC KEY-----";
      
      // Exporter la clé privée
      const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", privateKey);
      const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));
      const formattedPrivateKey =
        "-----BEGIN PRIVATE KEY-----\n" +
        privateKeyBase64.match(/.{1,64}/g).join("\n") +
        "\n-----END PRIVATE KEY-----";
      
      // Chiffrer la clé privée avec le mot de passe de l'utilisateur
      // Générer sel et IV aléatoires
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(16));
      
      // Dériver une clé de chiffrement à partir du mot de passe et du sel
      const passwordEncoder = new TextEncoder();
      const passwordKey = await window.crypto.subtle.importKey(
        "raw",
        passwordEncoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );
      
      const aesKey = await window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: 100000,
          hash: "SHA-256"
        },
        passwordKey,
        { name: "AES-CBC", length: 256 },
        false,
        ["encrypt"]
      );
      
      // Chiffrer la clé privée avec AES-CBC
      const privateKeyBytes = new TextEncoder().encode(formattedPrivateKey);
      const encryptedPrivateKeyBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-CBC", iv },
        aesKey,
        privateKeyBytes
      );
      
      // Convertir les données binaires en base64 pour le stockage
      const encryptedPrivateKeyBase64 = btoa(
        String.fromCharCode(...new Uint8Array(encryptedPrivateKeyBuffer))
      );
      const saltBase64 = btoa(String.fromCharCode(...salt));
      const ivBase64 = btoa(String.fromCharCode(...iv));
      
      // Format: salt.iv.encryptedPrivateKey (tous en base64)
      const encryptedPrivateKey = `${saltBase64}.${ivBase64}.${encryptedPrivateKeyBase64}`;
      
      console.log("Génération des clés terminée");
      return { publicKey: formattedPublicKey, encryptedPrivateKey };
    } catch (error) {
      console.error("Erreur lors de la génération des clés:", error);
      throw new Error(`Échec de la génération des clés: ${error.message}`);
    }
  },
  
  /**
   * Déchiffre la clé privée avec le mot de passe de l'utilisateur
   * @param {String} encryptedPrivateKey - Clé privée chiffrée
   * @param {String} password - Mot de passe de l'utilisateur
   * @returns {String} - Clé privée au format PEM
   */
  decryptPrivateKey: async (encryptedPrivateKey, password) => {
    try {
      // Décomposer la chaîne encodée
      const [saltBase64, ivBase64, encryptedKeyBase64] = encryptedPrivateKey.split('.');
      
      // Convertir de base64 en ArrayBuffer
      const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
      const encryptedData = Uint8Array.from(atob(encryptedKeyBase64), c => c.charCodeAt(0));
      
      // Dériver la clé AES à partir du mot de passe
      const passwordEncoder = new TextEncoder();
      const passwordKey = await window.crypto.subtle.importKey(
        "raw",
        passwordEncoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );
      
      const aesKey = await window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: 100000,
          hash: "SHA-256"
        },
        passwordKey,
        { name: "AES-CBC", length: 256 },
        false,
        ["decrypt"]
      );
      
      // Déchiffrer la clé privée
      const decryptedData = await window.crypto.subtle.decrypt(
        { name: "AES-CBC", iv },
        aesKey,
        encryptedData
      );
      
      // Convertir le résultat en chaîne
      const privateKey = new TextDecoder().decode(decryptedData);
      return privateKey;
    } catch (error) {
      console.error("Erreur lors du déchiffrement de la clé privée:", error);
      throw new Error("Mot de passe incorrect ou clé privée corrompue");
    }
  },
  
  /**
   * Récupère la clé publique d'un utilisateur
   * @param {String} userId - ID de l'utilisateur
   * @returns {Object} - Objet contenant l'email et la clé publique
   */
  getUserPublicKey: async (userId) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Non authentifié');
      
      const response = await fetch(`https://runova.onrender.com/api/keys/public/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Impossible de récupérer la clé publique');
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de la clé publique:', error);
      throw error;
    }
  },
  
  /**
   * Récupère les clés publiques de plusieurs utilisateurs
   * @param {Array} userIds - Liste des IDs utilisateurs
   * @returns {Object} - Map des clés publiques par ID utilisateur
   */
  getUsersPublicKeys: async (userIds) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Non authentifié');
      
      const response = await fetch('https://runova.onrender.com/api/keys/public/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userIds })
      });
      
      if (!response.ok) {
        throw new Error('Impossible de récupérer les clés publiques');
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des clés publiques:', error);
      throw error;
    }
  },

/**
 * Re-chiffre la clé privée avec un nouveau mot de passe
 * @param {String} encryptedPrivateKey - Clé privée chiffrée avec l'ancien mot de passe
 * @param {String} oldPassword - Ancien mot de passe
 * @param {String} newPassword - Nouveau mot de passe
 * @returns {String} - Clé privée re-chiffrée avec le nouveau mot de passe
 */
reEncryptPrivateKey: async (encryptedPrivateKey, oldPassword, newPassword) => {
  try {
    // 1. D'abord, déchiffrer la clé privée avec l'ancien mot de passe
    const decryptedPrivateKey = await CryptoService.decryptPrivateKey(
      encryptedPrivateKey, 
      oldPassword
    );
    
    // 2. Générer un nouveau sel et IV pour le rechiffrement
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    
    // 3. Dériver une clé de chiffrement à partir du nouveau mot de passe
    const passwordEncoder = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
      "raw",
      passwordEncoder.encode(newPassword),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    
    const aesKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      passwordKey,
      { name: "AES-CBC", length: 256 },
      false,
      ["encrypt"]
    );
    
    // 4. Rechiffrer la clé privée avec la nouvelle clé de chiffrement
    const privateKeyBytes = new TextEncoder().encode(decryptedPrivateKey);
    const encryptedPrivateKeyBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-CBC", iv },
      aesKey,
      privateKeyBytes
    );
    
    // 5. Convertir les données binaires en base64 pour le stockage
    const encryptedPrivateKeyBase64 = btoa(
      String.fromCharCode(...new Uint8Array(encryptedPrivateKeyBuffer))
    );
    const saltBase64 = btoa(String.fromCharCode(...salt));
    const ivBase64 = btoa(String.fromCharCode(...iv));
    
    // Format: salt.iv.encryptedPrivateKey (tous en base64)
    const newEncryptedPrivateKey = `${saltBase64}.${ivBase64}.${encryptedPrivateKeyBase64}`;
    
    return newEncryptedPrivateKey;
  } catch (error) {
    console.error("Erreur lors du rechiffrement de la clé privée:", error);
    throw new Error(`Échec du rechiffrement: ${error.message}`);
  }
},
/**
 * Re-chiffre la clé privée avec un nouveau mot de passe
 * @param {String} encryptedPrivateKey - Clé privée chiffrée avec l'ancien mot de passe
 * @param {String} oldPassword - Ancien mot de passe
 * @param {String} newPassword - Nouveau mot de passe
 * @returns {String} - Clé privée re-chiffrée avec le nouveau mot de passe
 */
reEncryptPrivateKey: async (encryptedPrivateKey, oldPassword, newPassword) => {
  try {
    console.log('Début du rechiffrement de la clé privée...');
    
    // 1. D'abord, déchiffrer la clé privée avec l'ancien mot de passe
    console.log('Déchiffrement avec l\'ancien mot de passe...');
    const decryptedPrivateKey = await CryptoService.decryptPrivateKey(
      encryptedPrivateKey, 
      oldPassword
    );
    
    // Vérifier que la clé privée déchiffrée est valide
    if (!decryptedPrivateKey || !decryptedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('La clé privée déchiffrée semble invalide');
    }
    
    console.log('Clé privée déchiffrée avec succès');
    
    // 2. Générer un nouveau sel et IV pour le rechiffrement
    console.log('Génération de nouveaux paramètres de chiffrement...');
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    
    // 3. Dériver une clé de chiffrement à partir du nouveau mot de passe
    console.log('Dérivation de la nouvelle clé de chiffrement...');
    const passwordEncoder = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
      "raw",
      passwordEncoder.encode(newPassword),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    
    const aesKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      passwordKey,
      { name: "AES-CBC", length: 256 },
      false,
      ["encrypt"]
    );
    
    // 4. Rechiffrer la clé privée avec la nouvelle clé de chiffrement
    console.log('Rechiffrement de la clé privée...');
    const privateKeyBytes = new TextEncoder().encode(decryptedPrivateKey);
    const encryptedPrivateKeyBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-CBC", iv },
      aesKey,
      privateKeyBytes
    );
    
    // 5. Convertir les données binaires en base64 pour le stockage
    const encryptedPrivateKeyBase64 = btoa(
      String.fromCharCode(...new Uint8Array(encryptedPrivateKeyBuffer))
    );
    const saltBase64 = btoa(String.fromCharCode(...salt));
    const ivBase64 = btoa(String.fromCharCode(...iv));
    
    // Format: salt.iv.encryptedPrivateKey (tous en base64)
    const newEncryptedPrivateKey = `${saltBase64}.${ivBase64}.${encryptedPrivateKeyBase64}`;
    
    // 6. Vérification: essayer de déchiffrer la nouvelle clé pour s'assurer qu'elle fonctionne
    console.log('Vérification du rechiffrement...');
    try {
      const testDecrypt = await CryptoService.decryptPrivateKey(
        newEncryptedPrivateKey, 
        newPassword
      );
      
      if (testDecrypt !== decryptedPrivateKey) {
        throw new Error('La vérification du rechiffrement a échoué');
      }
      
      console.log('Vérification réussie - la clé peut être déchiffrée avec le nouveau mot de passe');
    } catch (verifyError) {
      console.error('Erreur lors de la vérification:', verifyError);
      throw new Error('Le rechiffrement a échoué lors de la vérification');
    }
    
    console.log('Rechiffrement terminé avec succès');
    return newEncryptedPrivateKey;
    
  } catch (error) {
    console.error("Erreur lors du rechiffrement de la clé privée:", error);
    
    // Messages d'erreur plus spécifiques
    if (error.message.includes('Mot de passe incorrect')) {
      throw new Error('Mot de passe actuel incorrect');
    } else if (error.message.includes('clé privée corrompue')) {
      throw new Error('La clé privée stockée semble corrompue');
    } else if (error.message.includes('vérification')) {
      throw new Error('Erreur lors de la vérification du rechiffrement');
    } else {
      throw new Error(`Échec du rechiffrement: ${error.message}`);
    }
  }
}
};

export default CryptoService;