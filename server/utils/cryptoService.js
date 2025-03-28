// Implémentation suggérée pour server/utils/cryptoService.js
// Attention: Ceci est une suggestion basée sur la structure visible dans le code client

const crypto = require('crypto');

/**
 * Service de cryptographie pour le serveur
 */
class CryptoService {
  /**
   * Déchiffre la clé privée avec le mot de passe de l'utilisateur
   * @param {String} encryptedPrivateKey - Clé privée chiffrée
   * @param {String} password - Mot de passe de l'utilisateur
   * @returns {String} - Clé privée au format PEM
   */
  decryptPrivateKey(encryptedPrivateKey, password) {
    try {
      // Décomposer la chaîne encodée avec des points comme séparateurs
      const [saltBase64, ivBase64, encryptedKeyBase64] = encryptedPrivateKey.split('.');
      
      if (!saltBase64 || !ivBase64 || !encryptedKeyBase64) {
        throw new Error('Format de clé privée chiffrée invalide');
      }
      
      // Convertir de base64 en Buffer
      const salt = Buffer.from(saltBase64, 'base64');
      const iv = Buffer.from(ivBase64, 'base64');
      const encryptedData = Buffer.from(encryptedKeyBase64, 'base64');
      
      // Dériver la clé AES à partir du mot de passe
      const derivedKey = crypto.pbkdf2Sync(
        password,
        salt,
        100000, // Même nombre d'itérations que côté client
        32, // 256 bits pour AES-256
        'sha256'
      );
      
      // Déchiffrer la clé privée
      const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, iv);
      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      // Convertir le résultat en chaîne
      const privateKey = decrypted.toString('utf8');
      return privateKey;
    } catch (error) {
      console.error("Erreur lors du déchiffrement de la clé privée:", error);
      throw new Error("Mot de passe incorrect ou clé privée corrompue: " + error.message);
    }
  }
}

module.exports = new CryptoService();