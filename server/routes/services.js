const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const { authMiddleware } = require('../middleware/auth');
const { fetchSchemaFromDatabase } = require('../utils/schemaUtils');
const { encryptDatabasePassword, decryptDatabasePassword } = require('../utils/encryption');
const { logger } = require('../utils/logger');
const sql = require('mssql');
const DatabaseObject = require('../models/DatabaseObject');

router.use(authMiddleware);

// Create service
router.post('/', async (req, res) => {
  try {
    // Encrypt the password before saving
    const encryptedPassword = encryptDatabasePassword(req.body.password);
    
    const service = new Service({
      ...req.body,
      password: encryptedPassword,
      createdBy: req.user.userId
    });

    // Fetch and store schema when creating service
    const schema = await fetchSchemaFromDatabase({
      ...service.toObject(),
      password: req.body.password // Use original password for schema fetch
    });
    service.databaseSchema = schema;

    await service.save();
    res.status(201).json(service);
  } catch (error) {
    logger.error('Error creating service:', error);
    res.status(500).json({ message: 'Failed to create service' });
  }
});

// Refresh schema
router.post('/:id/refresh-schema', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    logger.info(`Refreshing schema for service: ${service.name} (${service._id})`);

    const decryptedPassword = decryptDatabasePassword(service.password);
    const schema = await fetchSchemaFromDatabase({
      ...service.toObject(),
      password: decryptedPassword
    });

    const objectPaths = [
      ...schema.tables.map(t => ({ path: t.path })),
      ...schema.views.map(v => ({ path: v.path })),
      ...schema.procedures.map(p => ({ path: p.path }))
    ];

    // Update or create database objects record
    const updatedObjects = await DatabaseObject.findOneAndUpdate(
      { serviceId: service._id },
      { 
        serviceId: service._id,
        objects: objectPaths
      },
      { upsert: true, new: true }
    );

    res.json({ 
      message: 'Schema refreshed successfully',
      service: service.name,
      objectCount: {
        tables: schema.tables.length,
        views: schema.views.length,
        procedures: schema.procedures.length,
        total: objectPaths.length
      }
    });
  } catch (error) {
    logger.error('Error refreshing schema:', error);
    res.status(500).json({ message: 'Failed to refresh schema' });
  }
});

// Get schema for a service
router.get('/:id/schema', async (req, res) => {
  try {
    const dbObjects = await DatabaseObject.findOne({ serviceId: req.params.id });
    if (!dbObjects) {
      return res.json({
        tables: [],
        views: [],
        procedures: []
      });
    }

    const schema = {
      tables: dbObjects.objects
        .filter(o => o.path.startsWith('/table/'))
        .map(o => ({ name: o.path.replace('/table/', '') })),
      views: dbObjects.objects
        .filter(o => o.path.startsWith('/view/'))
        .map(o => ({ name: o.path.replace('/view/', '') })),
      procedures: dbObjects.objects
        .filter(o => o.path.startsWith('/proc/'))
        .map(o => ({ name: o.path.replace('/proc/', '') }))
    };

    res.json(schema);
  } catch (error) {
    logger.error('Error fetching schema:', error);
    res.status(500).json({ message: 'Failed to fetch schema' });
  }
});

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

// Test connection handler
const testConnection = async (req, res) => {
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

    // Handle password
    let password = req.body.password;
    try {
      // Always try to decrypt, the decrypt function will handle both encrypted and unencrypted passwords
      password = decryptDatabasePassword(password);
      console.log('Password processed successfully');
    } catch (error) {
      console.error('Password processing error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process password'
      });
    }

    // Test the connection
    const config = {
      user: req.body.username,
      password: password,
      server: req.body.host,
      port: parseInt(req.body.port),
      database: req.body.database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 30000
      }
    };

    console.log('Testing connection with:', {
      ...config,
      password: '[REDACTED]'
    });

    const pool = await sql.connect(config);
    await pool.request().query('SELECT 1');
    await pool.close();

    res.json({ 
      success: true,
      message: 'Connection successful'
    });

  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
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
    console.log('Request headers:', req.headers);
    
    const service = await Service.findById(req.params.serviceId);
    console.log('Service lookup result:', service ? 'Found' : 'Not Found');
    
    if (!service) {
      console.error('Service not found:', req.params.serviceId);
      return res.status(404).json({ message: 'Service not found' });
    }
 
    console.log('MongoDB Service Found:', {
      id: service._id.toString(),
      name: service.name,
      host: service.host,
      port: service.port,
      database: service.database,
      username: service.username
    });
 
    const decryptedPassword = decryptDatabasePassword(service.password);
    console.log('Password decrypted successfully');
 
    const connectionConfig = {
      user: service.username,
      password: decryptedPassword,
      server: service.host,
      port: parseInt(service.port),
      database: service.database,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: 30000
      }
    };
 
    console.log('Attempting SQL connection with:', {
      ...connectionConfig,
      password: '[REDACTED]'
    });
 
    pool = await sql.connect(connectionConfig);
    console.log('SQL connection established');
 
    console.log('About to execute SQL query');
    const objects = await pool.request().query(`
      SELECT 
        o.name,
        o.type_desc,
        o.type,
        s.name as schema_name,
        CASE 
          WHEN o.type IN ('U') THEN 'TABLE'
          WHEN o.type IN ('V') THEN 'VIEW'
          WHEN o.type IN ('P', 'PC') THEN 'PROCEDURE'
          ELSE o.type_desc
        END as object_category
      FROM sys.objects o
      JOIN sys.schemas s ON o.schema_id = s.schema_id
      WHERE o.type IN ('U', 'V', 'P', 'PC')
        AND o.is_ms_shipped = 0
        AND s.name = 'dbo'
      ORDER BY o.type_desc, o.name;
    `);
    
    console.log('Raw query results:', {
      hasRecordset: !!objects.recordset,
      recordCount: objects.recordset?.length,
      firstRecord: objects.recordset?.[0]
    });
 
    console.log('Query Results:', {
      total: objects.recordset.length,
      byType: {
        tables: objects.recordset.filter(o => o.object_category === 'TABLE').length,
        views: objects.recordset.filter(o => o.object_category === 'VIEW').length,
        procedures: objects.recordset.filter(o => o.object_category === 'PROCEDURE').length
      },
      sample: {
        tables: objects.recordset.filter(o => o.object_category === 'TABLE').slice(0, 2),
        views: objects.recordset.filter(o => o.object_category === 'VIEW').slice(0, 2),
        procedures: objects.recordset.filter(o => o.object_category === 'PROCEDURE').slice(0, 2)
      }
    });
 
    res.json(objects.recordset || []);
  } catch (error) {
    console.error('Detailed error in objects endpoint:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      state: error.state,
      name: error.name
    });
    res.status(500).json({ 
      message: 'Failed to fetch objects',
      error: error.message 
    });
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