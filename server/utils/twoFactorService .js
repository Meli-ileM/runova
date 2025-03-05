const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

/**
 * Service pour gérer l'authentification à deux facteurs
 */
const twoFactorService = {
  /**
   * Génère un secret temporaire pour l'authentification 2FA
   * @param {string} userEmail - Email de l'utilisateur
   * @returns {Object} Un objet contenant le secret et le QR code
   */
  generateSecret: async (userEmail) => {
    try {
      // Générer un secret
      const secret = speakeasy.generateSecret({
        name: `RUNOVA:${userEmail}`,
        length: 20
      });

      // Générer le QR code en base64
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

      return {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url,
        qrCode: qrCodeUrl
      };
    } catch (error) {
      console.error('Erreur lors de la génération du secret 2FA:', error);
      throw new Error('Erreur lors de la génération du secret 2FA');
    }
  },

  /**
   * Vérifie un code TOTP
   * @param {string} token - Le code entré par l'utilisateur
   * @param {string} secret - Le secret de l'utilisateur
   * @returns {boolean} True si le code est valide
   */
  verifyToken: (token, secret) => {
    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 1 // Permet une petite marge d'erreur dans le timing
      });
    } catch (error) {
      console.error('Erreur lors de la vérification du code 2FA:', error);
      return false;
    }
  }
};

module.exports = twoFactorService;