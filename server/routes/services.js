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
    console.log('\n=== Fetching Objects for Service ===');
    console.log('ServiceID:', req.params.serviceId);
    console.log('Headers:', req.headers);

    const service = await Service.findById(req.params.serviceId);
    console.log('Found service:', {
      name: service.name,
      host: service.host,
      port: service.port,
      database: service.database
    });
    
    // This is the SQL connection part that needs to match the working test connection
    const connectionData = {
      username: service.username,
      password: decryptDatabasePassword(service.password),
      host: service.host,
      port: service.port,
      database: service.database
    };

    // Use the same approach that works in test connection
    const result = await databaseService.testConnection(connectionData);
    if (!result.success) {
      return res.status(500).json({ message: 'Failed to connect to database' });
    }

    // Now get the objects using the working connection
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
      SELECT 
        o.name,
        o.type_desc,
        o.type,
        s.name as schema_name
      FROM sys.objects o
      JOIN sys.schemas s ON o.schema_id = s.schema_id
      WHERE o.type IN ('U', 'V', 'P', 'FN', 'IF', 'TF')
        AND o.is_ms_shipped = 0
      ORDER BY o.type_desc, o.name;
    `);

    console.log('SQL Query Results:', {
      total: objects.recordset.length,
      types: [...new Set(objects.recordset.map(o => o.type_desc))],
      sample: objects.recordset.slice(0, 3)
    });
    
    res.json(objects.recordset || []);
  } catch (error) {
    console.error('Error fetching objects:', error);
    res.status(500).json({ message: 'Failed to fetch objects' });
  } finally {
    if (pool) await pool.close();
  }
});

module.exports = router;