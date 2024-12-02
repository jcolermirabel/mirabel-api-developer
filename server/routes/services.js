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
    
    // Get service from MongoDB
    const service = await Service.findById(req.params.serviceId);
    if (!service) {
      console.error('Service not found:', req.params.serviceId);
      return res.status(404).json({ message: 'Service not found' });
    }

    console.log('MongoDB Service Details:', {
      id: service._id,
      name: service.name,
      host: service.host,
      port: service.port,
      database: service.database,
      username: service.username
    });

    // Decrypt and prepare connection
    const decryptedPassword = decryptDatabasePassword(service.password);
    const connectionConfig = {
      user: service.username,
      password: decryptedPassword,
      server: service.host,
      port: parseInt(service.port),
      database: service.database,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    };

    console.log('SQL Connection Config:', {
      ...connectionConfig,
      password: '[REDACTED]'
    });

    // Connect and query
    pool = await sql.connect(connectionConfig);
    const objects = await pool.request().query(`
      SELECT 
        o.name,
        o.type_desc,
        o.type,
        s.name as schema_name
      FROM sys.objects o
      JOIN sys.schemas s ON o.schema_id = s.schema_id
      WHERE o.type IN ('U', 'V', 'P')
        AND o.is_ms_shipped = 0
        AND s.name = 'dbo'
      ORDER BY o.type_desc, o.name;
    `);

    console.log('Query Results:', {
      total: objects.recordset.length,
      byType: {
        tables: objects.recordset.filter(o => o.type === 'U').length,
        views: objects.recordset.filter(o => o.type === 'V').length,
        procedures: objects.recordset.filter(o => o.type === 'P').length
      }
    });

    res.json(objects.recordset || []);
  } catch (error) {
    console.error('Error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Failed to fetch objects' });
  } finally {
    if (pool) await pool.close();
  }
});

module.exports = router;