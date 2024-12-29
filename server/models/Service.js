const mongoose = require('mongoose');
const sql = require('mssql');
const { decryptDatabasePassword } = require('../utils/encryption');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  host: { type: String, required: true },
  port: { type: Number, required: true },
  database: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  failoverHost: { type: String, required: false },
}, { timestamps: true });

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