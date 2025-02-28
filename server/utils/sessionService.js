// sessionService.js - à créer dans utils/sessionService.js
/**
 * Service pour gérer la session et le stockage du mot de passe pour le déchiffrement
 */
class SessionService {
  /**
   * Obtient le mot de passe de déchiffrement actuel
   * @returns {string|null} Mot de passe ou null si non disponible
   */
  static getDecryptionPassword() {
    // Priorité au stockage en session pour la sécurité
    return sessionStorage.getItem('emailDecryptKey');
  }

  /**
   * Vérifie si un mot de passe de déchiffrement est disponible
   * @returns {boolean} Vrai si un mot de passe est disponible
   */
  static hasDecryptionPassword() {
    return !!this.getDecryptionPassword();
  }

  /**
   * Stocke le mot de passe de déchiffrement en session
   * @param {string} password - Mot de passe à stocker
   */
  static setDecryptionPassword(password) {
    if (password) {
      sessionStorage.setItem('emailDecryptKey', password);
    }
  }

  /**
   * Supprime le mot de passe de déchiffrement de la session
   */
  static clearDecryptionPassword() {
    sessionStorage.removeItem('emailDecryptKey');
  }
  
  /**
   * Demande à l'utilisateur de saisir son mot de passe pour le déchiffrement
   * @returns {Promise<string|null>} Promesse résolue avec le mot de passe ou null si annulé
   */
  static async promptForPassword() {
    // Cette implémentation dépend de votre interface utilisateur
    // Exemple avec une boîte de dialogue native (à remplacer par votre interface utilisateur)
    const password = prompt('Veuillez saisir votre mot de passe pour déchiffrer vos emails', '');
    
    if (password) {
      // Stocker en session pour éviter de redemander
      this.setDecryptionPassword(password);
      return password;
    }
    
    return null;
  }
}

export default SessionService;
