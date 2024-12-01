const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const sql = require('mssql');
const { decryptDatabasePassword } = require('../utils/encryption');
const { logger } = require('../middleware/logger');
const { encryptDatabasePassword } = require('../utils/databaseEncryption');

// Test connection handler with enhanced logging
const testConnection = async (req, res) => {
  let pool;
  try {
    console.log('Raw incoming request:', {
      body: {
        ...req.body,
        password: req.body.password ? '[REDACTED]' : undefined
      },
      method: req.method,
      path: req.path,
      contentType: req.headers['content-type']
    });

    if (!req.body.username || !req.body.password || !req.body.host || !req.body.port || !req.body.database) {
      logger.error('Missing required connection parameters', {
        hasUsername: !!req.body.username,
        hasPassword: !!req.body.password,
        hasHost: !!req.body.host,
        hasPort: !!req.body.port,
        hasDatabase: !!req.body.database
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required connection parameters'
      });
    }

    // Decrypt password if it's in encrypted format
    let password = req.body.password;
    if (password.includes(':')) {  // Check if password is in encrypted format
      try {
        password = decryptDatabasePassword(password);
      } catch (decryptError) {
        // If decryption fails, use the password as-is (it might be a plain password for testing)
        logger.info('Password decryption skipped - using as-is for testing');
      }
    }

    const config = {
      user: req.body.username,
      password: password,
      server: req.body.host,
      port: parseInt(req.body.port),
      database: req.body.database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        cryptoCredentialsDetails: {
          minVersion: 'TLSv1'
        },
        connectionTimeout: 30000,
        requestTimeout: 30000,
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000
        }
      }
    };

    logger.info('Attempting database connection with config:', {
      server: config.server,
      port: config.port,
      database: config.database,
      user: config.user,
      options: config.options
    });

    pool = await sql.connect(config);
    logger.info('SQL connection established, testing query');
    
    await pool.request().query('SELECT 1 as test');
    logger.info('Test query successful');
    
    res.json({ 
      success: true, 
      message: 'Connection successful'
    });
  } catch (error) {
    logger.error('Test connection failed:', {
      error: {
        message: error.message,
        code: error.code,
        state: error.state,
        stack: error.stack
      }
    });

    res.status(500).json({ 
      success: false, 
      message: 'Connection failed',
      error: error.message,
      code: error.code
    });
  } finally {
    if (pool) {
      try {
        await sql.close();
        logger.info('Connection pool closed');
      } catch (closeError) {
        logger.error('Error closing connection pool:', closeError);
      }
    }
  }
};

// Public API endpoint handler
const handlePublicEndpoint = async (req, res) => {
  let pool;
  try {
    console.log('Public API - Request received:', {
      params: req.params,
      query: req.query,
      headers: {
        'x-mirabel-api': req.headers['x-mirabel-api'] ? 'present' : 'missing',
        accept: req.headers.accept
      }
    });

    const service = req.service;
    console.log('Public API - Looking for service:', {
      serviceId: req.params.serviceId,
      endpoint: req.params.endpoint
    });

    if (!service) {
      console.log('Public API - Service not found');
      return res.status(404).json({ message: 'Service not found' });
    }

    console.log('Public API - Raw service data:', service);

    console.log('Public API - Service lookup result:', {
      found: !!service,
      serviceName: service.name,
      serviceId: service._id,
      isActive: service.isActive,
      host: service.host,
      port: service.port,
      database: service.database
    });

    const config = {
      user: service.username,
      password: decryptDatabasePassword(service.password),
      server: service.host,
      port: parseInt(service.port),
      database: service.database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        cryptoCredentialsDetails: {
          minVersion: 'TLSv1'
        },
        connectionTimeout: 30000,
        requestTimeout: 30000,
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000
        }
      }
    };

    console.log('Public API - Service found:', {
      id: service._id,
      name: service.name,
      endpoint: req.params.endpoint
    });

    pool = await sql.connect(config);
    const request = pool.request();
    
    Object.entries(req.query).forEach(([key, value]) => {
      request.input(key, value);
    });

    const result = await request.execute(req.params.endpoint);

    if (!result || !result.recordset) {
      throw new Error('No results returned from stored procedure');
    }

    const cleanResults = result.recordset.map(record => {
      const processedRecord = {};
      for (const [key, value] of Object.entries(record)) {
        processedRecord[key] = value instanceof Date ? value.toISOString() : value;
      }
      return processedRecord;
    });

    res.json(cleanResults);
  } catch (error) {
    console.error('API endpoint error:', error);
    res.status(500).json({ 
      message: error.message,
      code: error.code 
    });
  } finally {
    if (pool) {
      try {
        await sql.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
};

// Protected admin endpoints
const getServices = async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch services' });
  }
};

const createService = async (req, res) => {
  try {
    const serviceData = req.body;
    if (serviceData.password) {
      serviceData.password = encryptDatabasePassword(serviceData.password);
    }
    const service = new Service(serviceData);
    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create service' });
  }
};

const getService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch service' });
  }
};

const updateService = async (req, res) => {
  try {
    const serviceData = req.body;
    if (serviceData.password) {
      serviceData.password = encryptDatabasePassword(serviceData.password);
    }
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      serviceData,
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update service' });
  }
};

const deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete service' });
  }
};

const getDatabaseObjects = async (req, res) => {
  let pool;
  try {
    const service = await Service.findById(req.params.serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    console.log('Database Objects - Service found:', {
      id: service._id,
      name: service.name,
      host: service.host,
      port: service.port,
      database: service.database
    });

    const config = {
      user: service.username,
      password: decryptDatabasePassword(service.password),
      server: service.host,
      port: parseInt(service.port),
      database: service.database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        cryptoCredentialsDetails: {
          minVersion: 'TLSv1'
        }
      }
    };

    console.log('Database Objects - Connection config:', {
      server: config.server,
      port: config.port,
      database: config.database
    });

    pool = await sql.connect(config);

    const [tables, views, procedures] = await Promise.all([
      pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
      `),
      pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.VIEWS
      `),
      pool.request().query(`
        SELECT ROUTINE_NAME 
        FROM INFORMATION_SCHEMA.ROUTINES 
        WHERE ROUTINE_TYPE = 'PROCEDURE'
      `)
    ]);

    res.json({
      tables: tables.recordset.map(r => r.TABLE_NAME),
      views: views.recordset.map(r => r.TABLE_NAME),
      procedures: procedures.recordset.map(r => r.ROUTINE_NAME)
    });
  } catch (error) {
    console.error('Error fetching database objects:', error);
    res.status(500).json({ message: error.message });
  } finally {
    if (pool) {
      try {
        await sql.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
};

// Route registrations (order matters!)
router.post('/test', testConnection);
router.get('/:serviceId/objects', getDatabaseObjects);
router.get('/:serviceId/:endpoint', handlePublicEndpoint);
router.get('/', getServices);
router.post('/', createService);
router.get('/:id', getService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);

module.exports = router;