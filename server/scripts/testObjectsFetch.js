require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const { decryptDatabasePassword } = require('../utils/encryption');
const sql = require('mssql');

async function testObjectsFetch() {
  let pool;
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get service
    const service = await Service.findById('674a92748eb6dee851254c10');
    console.log('Service found:', {
      name: service.name,
      host: service.host,
      port: service.port,
      database: service.database,
      username: service.username
    });

    // Decrypt password
    const password = decryptDatabasePassword(service.password);
    console.log('Password decrypted, length:', password.length);

    // Create config
    const config = {
      user: service.username,
      password: password,
      server: service.host,
      port: parseInt(service.port),
      database: service.database,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    };

    console.log('SQL config:', {
      ...config,
      password: '[REDACTED]'
    });

    // Test connection
    pool = await sql.connect(config);
    console.log('SQL connection established');

    // Test simple query
    const testResult = await pool.request().query('SELECT 1 as test');
    console.log('Test query result:', testResult.recordset);

    // Get objects
    const result = await pool.request().query(`
      SELECT TOP 5 name, type_desc 
      FROM sys.objects 
      WHERE type IN ('P', 'FN', 'IF', 'TF', 'V', 'U')
      ORDER BY type_desc, name
    `);

    console.log('Objects found:', result.recordset);

  } catch (error) {
    console.error('Error:', {
      message: error.message,
      code: error.code,
      state: error.state
    });
  } finally {
    if (pool) {
      await pool.close();
      console.log('Connection closed');
    }
    await mongoose.disconnect();
  }
}

testObjectsFetch(); 