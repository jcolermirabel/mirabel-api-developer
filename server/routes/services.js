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

// Objects endpoint using same approach as test connection
router.get('/:serviceId/objects', async (req, res) => {
  let pool;
  try {
    console.log('\n=== Fetching Database Objects ===');
    console.log('Service ID:', req.params.serviceId);
    
    const service = await Service.findById(req.params.serviceId);
    if (!service) {
      console.error('Service not found');
      return res.status(404).json({ message: 'Service not found' });
    }

    // Use the same connection approach that worked in test connection
    const connectionData = {
      username: service.username,
      password: decryptDatabasePassword(service.password),
      host: service.host,
      port: service.port,
      database: service.database
    };

    const result = await databaseService.testConnection(connectionData);
    if (!result.success) {
      console.error('Connection failed:', result.error);
      return res.status(500).json({ message: 'Failed to connect to database' });
    }

    // Now that we know connection works, get the objects
    pool = await sql.connect({
      user: connectionData.username,
      password: connectionData.password,
      server: connectionData.host,
      port: parseInt(connectionData.port),
      database: connectionData.database,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    });

    const objects = await pool.request().query(`
      SELECT name, type_desc 
      FROM sys.objects 
      WHERE type IN ('P', 'FN', 'IF', 'TF', 'V', 'U')
      ORDER BY type_desc, name
    `);

    console.log(`Found ${objects.recordset.length} objects`);
    res.json(objects.recordset || []);  // Return empty array if no results

  } catch (error) {
    console.error('Error fetching objects:', {
      message: error.message,
      code: error.code,
      state: error.state
    });
    res.status(500).json({ message: 'Failed to fetch objects' });
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('SQL connection closed');
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
});

module.exports = router;