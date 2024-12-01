const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  host: {
    type: String,
    required: true,
    trim: true
  },
  port: {
    type: Number,
    required: true
  },
  database: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    set: function(password) {
      // If password is already encrypted (contains ':'), return as is
      if (password.includes(':')) {
        return password;
      }
      // Otherwise, let the service layer handle encryption
      return password;
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Add logging to debug password handling
serviceSchema.pre('save', function(next) {
  console.log('Service pre-save:', {
    isNew: this.isNew,
    hasPassword: !!this.password,
    passwordLength: this.password?.length,
    isEncrypted: this.password?.includes(':')
  });
  next();
});

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service; 