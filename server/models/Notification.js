const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma pour les notifications
 */
const notificationSchema = new Schema({
  // L'utilisateur qui reçoit la notification
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // L'utilisateur qui a envoyé la notification (si applicable)
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Type de notification
  type: {
    type: String,
    enum: [
      'key_share_request',       // Demande de partage de clé publique
      'key_share_accepted',      // Demande de partage acceptée
      'key_share_rejected',      // Demande de partage refusée
      'new_message',             // Nouveau message reçu
      'system_notification'      // Notification système
    ],
    required: true
  },
  
  // Message de la notification
  message: {
    type: String,
    required: true
  },
  
  // État de lecture
  isRead: {
    type: Boolean,
    default: false
  },
  
  // Données supplémentaires associées à la notification (format flexible)
  data: {
    type: Object,
    default: {}
  },
  
  // Date de création
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Date de réponse (pour les demandes)
  responseDate: {
    type: Date
  }
});

// Indexation pour les requêtes fréquentes
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;