// Modèle Label unique (à la place des labels intégrés dans User)

const mongoose = require('mongoose');

const labelSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['email', 'contact'],
    default: 'email'
  },
  color: {
    type: String,
    default: "#4285F4",
    match: /^#([A-Fa-f0-9]{6})$/
  },

  // ← Liste des adresses email liées à ce label
  associatedEmails: [{
    type: String,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Adresse email invalide']
  }]
}, {
  timestamps: true
});

labelSchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Label', labelSchema);

// const mongoose = require('mongoose');

// const labelSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   name: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   type: {
//     type: String,
//     required: true,
//     enum: ['email', 'contact'],
//     default: 'email'
//   },
//   color: {
//     type: String,
//     default: "#4285F4",
//     match: /^#([A-Fa-f0-9]{6})$/
//   },
//   // Pour les labels système prédéfinis (Inbox, Sent, etc.)
//  /* systemIdentifier: {
//     type: String,
//     enum: [null, 'inbox', 'sent', 'drafts', 'trash', 'spam', 'starred'],
//     default: null
//   }*/
// }, {
//   timestamps: true
// });

// // Empêche les doublons (un utilisateur ne peut avoir 2 labels identiques)
// labelSchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });

// module.exports = mongoose.model('Label', labelSchema);