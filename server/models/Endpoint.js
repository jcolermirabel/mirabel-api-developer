const mongoose = require('mongoose');

const endpointSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
endpointSchema.index({ name: 1 });
endpointSchema.index({ isActive: 1 });

const Endpoint = mongoose.model('Endpoint', endpointSchema);

module.exports = Endpoint; 