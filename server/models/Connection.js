const mongoose = require('mongoose');
const { encryptDatabasePassword, decryptDatabasePassword } = require('../utils/encryption');
const sql = require('mssql');
const net = require('net');

const connectionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  host: { type: String, required: true },
  port: { type: Number, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  failoverHost: { type: String, required: false },
}, { timestamps: true });

// Pre-save middleware to encrypt password
connectionSchema.pre('save', function(next) {
  // only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  // just to be safe, don't re-encrypt if it's already encrypted
  // this is unlikely to happen given the above check, but good practice
  try {
    decryptDatabasePassword(this.password);
    // if no error, it's already encrypted
    return next();
  } catch (e) {
    // if decryption fails, it's a new plaintext password
    this.password = encryptDatabasePassword(this.password);
    next();
  }
});

// Method to test connection
connectionSchema.methods.testConnection = async function() {
  try {
    // If password is new (plain text), use it directly.
    // If it's existing (encrypted), decrypt it.
    const isEncrypted = this.password && this.password.includes(':');
    const decryptedPassword = isEncrypted
      ? decryptDatabasePassword(this.password)
      : this.password;
    
    const config = {
      user: this.username,
      password: decryptedPassword,
      server: this.host,
      port: parseInt(this.port) || 1433,
      options: {
        encrypt: true,
        trustServerCertificate: process.env.NODE_ENV !== 'production',
        connectTimeout: 30000
      }
    };

    const pool = await sql.connect(config);
    await pool.request().query('SELECT 1');
    await pool.close();
    
    return {
      success: true,
      message: 'Connection successful'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Method to get effective host (with failover support)
connectionSchema.methods.getEffectiveHost = async function() {
  // Try primary host first
  try {
    await new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = 2000; // 2 second timeout
      
      socket.setTimeout(timeout);
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
      
      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });
      
      socket.connect(this.port, this.host);
    });
    
    return this.host;
  } catch (error) {
    // If primary fails and failover exists, use failover
    if (this.failoverHost) {
      try {
        await new Promise((resolve, reject) => {
          const socket = new net.Socket();
          const timeout = 2000;
          
          socket.setTimeout(timeout);
          socket.on('connect', () => {
            socket.destroy();
            resolve();
          });
          
          socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Connection timeout'));
          });
          
          socket.on('error', (err) => {
            socket.destroy();
            reject(err);
          });
          
          socket.connect(this.port, this.failoverHost);
        });
        
        return this.failoverHost;
      } catch (failoverError) {
        throw new Error('Both primary and failover hosts are unreachable');
      }
    }
    throw new Error('Primary host is unreachable and no failover configured');
  }
};

module.exports = mongoose.model('Connection', connectionSchema); 