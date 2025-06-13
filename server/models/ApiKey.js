const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(32).toString('hex')
  },
  endpointId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Endpoint',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
apiKeySchema.index({ endpointId: 1, isActive: 1 });
apiKeySchema.index({ key: 1 }, { unique: true });

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKey; 