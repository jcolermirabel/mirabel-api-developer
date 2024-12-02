const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const { decryptDatabasePassword } = require('../utils/encryption');
const { logger } = require('../middleware/logger');
const databaseService = require('../services/databaseService');
const sql = require('mssql');

// Get all services
router.get('/', async (req, res, next) => {
  try {
    console.log('Fetching all services...');
    const services = await Service.find();
    console.log(`Found ${services.length} services`);
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    next(error);
  }
});

// Test connection handler with enhanced logging
const testConnection = async (req, res, next) => {
  try {
    console.log('\n=== Starting Service Test Connection ===');
    console.log('Request body:', {
      ...req.body,
      password: '[REDACTED]'
    });

    // Validate required fields
    const requiredFields = ['host', 'port', 'database', 'username', 'password'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Decrypt password if needed
    let password = req.body.password;
    if (password.includes(':')) {
      try {
        console.log('Attempting to decrypt password...');
        password = decryptDatabasePassword(password);
        console.log('Password decrypted successfully');
      } catch (decryptError) {
        console.error('Password decryption failed:', decryptError);
        return res.status(500).json({
          success: false,
          error: 'Password decryption failed'
        });
      }
    }

    const connectionData = {
      ...req.body,
      password
    };

    console.log('Testing connection with:', {
      host: connectionData.host,
      port: connectionData.port,
      database: connectionData.database,
      username: connectionData.username
    });

    const result = await databaseService.testConnection(connectionData);
    
    if (!result.success) {
      console.error('Connection test failed:', result.error);
      return res.status(500).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Test connection handler error:', error);
    next(error);
  }
};

// Error handler middleware
router.use((err, req, res, next) => {
  console.error('Services route error:', err);
  res.status(500).json({
    success: false,
    error: err.message,
    details: {
      code: err.code,
      state: err.state
    }
  });
});

// Route registrations
router.get('/', async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

router.post('/test', testConnection);

// Add this endpoint
router.get('/:serviceId/objects', async (req, res) => {
  try {
    console.log('Fetching objects for service:', req.params.serviceId);
    const service = await Service.findById(req.params.serviceId);
    
    const config = {
      user: service.username,
      password: decryptDatabasePassword(service.password),
      server: service.host,
      port: parseInt(service.port),
      database: service.database,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    };

    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT name, type_desc 
      FROM sys.objects 
      WHERE type IN ('P', 'FN', 'IF', 'TF', 'V', 'U')  // Added V for views, U for tables
      ORDER BY type_desc, name
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching objects:', error);
    res.status(500).json({ message: 'Failed to fetch objects' });
  }
});

module.exports = router;