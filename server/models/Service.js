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

module.exports = mongoose.model('Service', serviceSchema); 