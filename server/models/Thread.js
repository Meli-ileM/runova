const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema({
  subject: { 
    type: String,
    required: true 
  },
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  }],
  emailIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Email' 
  }],
  lastUpdated: { 
    type: Date, 
    default: Date.now,
    required: true 
  },
  labels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Label'
  }], 
  lastMessageAt: { type: Date, default: Date.now },
  // Utiliser une structure similaire à userEmailStatus dans Email.js
  userThreadStatus: {
    type: Map,
    of: {
      isArchived: { type: Boolean, default: false },
      isImportant: { type: Boolean, default: false },
      isDeleted: { type: Boolean, default: false },
      isRead: { type: Boolean, default: false },
      readAt: { type: Date }
    },
    default: () => new Map()
  }
}, { 
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
});

// Improved indexes to match controller usage patterns
threadSchema.index({ participants: 1 });
threadSchema.index({ lastMessageAt: -1 });
threadSchema.index({ 'userThreadStatus': 1 });

module.exports = mongoose.model('Thread', threadSchema);