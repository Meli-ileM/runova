
/**
 * Envoie un SMS à un numéro de téléphone
 * @param {string} phoneNumber - Le numéro de téléphone du destinataire
 * @param {string} message - Le message à envoyer
 * @returns {Promise}
 */
exports.sendSMS = async (phoneNumber, message) => {
  // En mode développement, on simule juste l'envoi et on affiche dans la console
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SMS SIMULÉ] à ${phoneNumber}: ${message}`);
    return Promise.resolve({ success: true });
  }
  
  // En production, utilisez votre service SMS préféré
  // Exemple avec un service REST générique:
  try {
    // Remplacez par les détails de votre fournisseur SMS
    const response = await axios.post('https://api.votre-fournisseur-sms.com/send', {
      apiKey: process.env.SMS_API_KEY,
      to: phoneNumber,
      message: message,
      from: 'RUNOVA'
    });
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de l\'envoi du SMS:', error);
    throw new Error('Échec de l\'envoi du SMS');
  }
};