// models/Email.js

const mongoose = require('mongoose');
const { Schema } = mongoose;


const emailSchema = new mongoose.Schema({
  threadId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Thread' 
  },
  parentEmailId: {  // Added missing field
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Email'
  },
  sender: {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    email: { 
      type: String, 
      required: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
    },
    name: { 
      type: String,
      trim: true
    }
  },
  subject: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  body: { 
    type: String, 
    required: true 
  },
  isDraft: { 
    type: Boolean, 
    default: false 
  },
    isEncrypted: {
    type: Boolean,
    default: false
  },
  encryptedSymKey: {
    type: Map,
    of: String,  // Clé symétrique chiffrée avec la clé publique de chaque destinataire
    default: {}
  },
   encryptedContent: {
    body: Schema.Types.Mixed, 
    subject: Schema.Types.Mixed,
    attachments: Schema.Types.Mixed,
    encryptedSymKey: Schema.Types.Mixed,
  },
  sentAt: { 
    type: Date, 
    default: Date.now 
  },
  labels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Label'
  }],
  recipients: {
    to: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      email: { type: String, required: true },
      name: { type: String },
      isRead: { type: Boolean, default: false },
      readAt: { type: Date },
      receivedAt: { type: Date, default: Date.now },
      recipientType: { type: String, enum: ['to', 'cc', 'bcc'], default: 'to' }
    }],
    cc: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      email: { type: String, required: true },
      name: { type: String },
      isRead: { type: Boolean, default: false },
      readAt: { type: Date },
      receivedAt: { type: Date, default: Date.now },
      recipientType: { type: String, enum: ['to', 'cc', 'bcc'], default: 'cc' }
    }],
    bcc: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      email: { type: String, required: true },
      name: { type: String },
      isRead: { type: Boolean, default: false },
      readAt: { type: Date },
      receivedAt: { type: Date, default: Date.now },
      recipientType: { type: String, enum: ['to', 'cc', 'bcc'], default: 'bcc' }
    }]
  },
  attachments: [{
    name: { type: String, required: true },
    url: { type: String, required: false },
    type: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
    isEncrypted: {
      type: Boolean,
      default: false
    },
  }],
 
  userEmailStatus: {
    type: Map,
    of: {
      isArchived: { type: Boolean, default: false },
      isDeleted: { type: Boolean, default: false },
      isImportant: { type: Boolean, default: false }
    },
    default: () => new Map()
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour amélioration des performances
emailSchema.index({ 'sender.userId': 1 });
emailSchema.index({ 'recipients.to.userId': 1 });
emailSchema.index({ 'recipients.cc.userId': 1 });
emailSchema.index({ 'recipients.bcc.userId': 1 });
emailSchema.index({ isDraft: 1, 'sender.userId': 1 });
emailSchema.index({ userEmailStatus: 1 });
emailSchema.index({ sentAt: -1 });
emailSchema.index({ parentEmailId: 1 });


module.exports = mongoose.model('Email', emailSchema);
