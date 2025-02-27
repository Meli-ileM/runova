const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  password: { 
    type: String, 
    required: true 
  },
  
  firstName: { 
    type: String,
    trim: true
  },
  lastName: { 
    type: String,
    trim: true 
  },
 
   // Champs pour 2FA
  twoFactorSecret: {
    type: String,
    default: null
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorTempSecret: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'away', 'busy','offline'],
    default: 'active'
  },
    // ✅ SÉPARATION: Statut de présence (ne doit PAS affecter l'accès au compte)
  presenceStatus: {
    type: String,
    enum: ['active', 'away', 'busy', 'offline'],
    default: 'active'
  },
  
  profilePhoto: { 
    type: String,
    default: 'default-avatar.jpg'
  },
  birthDate: { 
    type: Date 
  },
  publicKey: {
    type: String
  },
  encryptedPrivateKey: {
    type: String
  },
  keysGenerated: {
    type: Boolean,
    default: false
  },
  lastLogin: { 
    type: Date 
  },
  contacts: [
    {
      contactRef: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      email: { 
        type: String, 
        required: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
      },
      publicKey: {
        type: String
      },
      keyShareStatus: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'not_applicable'],
        default: 'not_applicable'
      },
      name: { 
        type: String, 
        required: true,
        trim: true
      },
      labels: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Label',
        validate: {
          validator: async function(labelId) {
            const label = await mongoose.model('Label').findById(labelId);
            return label && label.type === 'contact';
          },
          message: 'Le label doit être un label de contact'
        }
      }]
    }
  ],
  spamFilters: [{ 
    type: String,
    trim: true 
  }],
  
  systemLabels: {
    type: Map,
    of: {
      lastSynced: Date,
      unreadCount: { type: Number, default: 0 }
    },
    default: {
      inbox: { lastSynced: null, unreadCount: 0 },
      sent: { lastSynced: null, unreadCount: 0 },
      drafts: { lastSynced: null, unreadCount: 0 },
      trash: { lastSynced: null, unreadCount: 0 },
      spam: { lastSynced: null, unreadCount: 0 }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Middleware pour le hash du mot de passe
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (err) {
    next(err);
  }
});

// Index pour les recherches courantes
userSchema.index({ 'contacts.email': 1 });
userSchema.index({ 'contacts.labels': 1 });

module.exports = mongoose.model('User', userSchema);