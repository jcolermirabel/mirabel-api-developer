const mongoose = require('mongoose');
const sql = require('mssql');
const { decryptDatabasePassword, encryptDatabasePassword } = require('../utils/encryption');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  host: { type: String, required: false },
  port: { type: Number, required: false },
  database: { type: String, required: true },
  username: { type: String, required: false },
  password: { type: String, required: false },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  failoverHost: { type: String, required: false },
  connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Connection', required: false },
}, { timestamps: true });

// Pre-save middleware to encrypt password
serviceSchema.pre('save', function(next) {
  // only hash the password if it has been modified (or is new) AND it exists
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  // just to be safe, don't re-encrypt if it's already encrypted
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

// Add method to execute stored procedure
serviceSchema.methods.executeProcedure = async function(procedureName) {
  try {
    const decryptedPassword = decryptDatabasePassword(this.password);
    
    const config = {
      user: this.username,
      password: decryptedPassword,
      server: this.host,
      database: this.database,
      port: this.port,
      options: {
        encrypt: true,
        trustServerCertificate: true
      }
    };

    const pool = await sql.connect(config);
    const result = await pool.request().execute(procedureName);
    await sql.close();
    
    return result.recordset;
  } catch (error) {
    console.error('Procedure execution error:', error);
    throw new Error(`Failed to execute procedure: ${error.message}`);
  }
};

// Add a method to get the effective host
serviceSchema.methods.getEffectiveHost = async function() {
  const net = require('net');
  
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

module.exports = mongoose.model('Service', serviceSchema); 