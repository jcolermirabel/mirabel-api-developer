const mongoose = require('mongoose');

const userLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Can be null for failed login attempts
  },
  email: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'failed_login', 'register', 'password_change', 'profile_update']
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for efficient querying
userLogSchema.index({ userId: 1, timestamp: -1 });
userLogSchema.index({ email: 1, timestamp: -1 });
userLogSchema.index({ action: 1, timestamp: -1 });
userLogSchema.index({ ipAddress: 1, timestamp: -1 });

module.exports = mongoose.model('UserLog', userLogSchema); 