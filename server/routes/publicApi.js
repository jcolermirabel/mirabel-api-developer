const express = require('express');
const router = express.Router();
const sql = require('mssql');
const Service = require('../models/Service');
const Connection = require('../models/Connection');
const ApiUsage = require('../models/ApiUsage');
const { decryptDatabasePassword } = require('../utils/encryption');
const { consolidatedApiKeyMiddleware } = require('../middleware/consolidatedAuthMiddleware');

// Public API endpoint handler for stored procedures
router.get('/:serviceName/_proc/:procedureName', consolidatedApiKeyMiddleware, async (req, res) => {
  let pool;
  try {
    console.log('Public API - Request received:', {
      params: req.params,
      query: req.query,
      headers: {
        'x-mirabel-api-key': req.headers['x-mirabel-api-key'] ? 'present' : 'missing',
        'accept': req.headers['accept']
      }
    });

    console.log('Public API - Looking for service:', {
      serviceName: req.params.serviceName,
      procedureName: req.params.procedureName
    });

    // Find service by case-insensitive name
    const service = await Service.findOne({ 
      name: { $regex: new RegExp(`^${req.params.serviceName}$`, 'i') },
      isActive: true
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found or inactive' });
    }

    let connectionDetails = {};

    if (service.connectionId) {
      const connection = await Connection.findById(service.connectionId).select('+password');
      if (!connection) {
        throw new Error('The underlying connection for this service could not be found.');
      }
      connectionDetails = {
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password: connection.password,
      };
    } else {
      // Fallback for older services without a dedicated connection object
      connectionDetails = {
        host: service.host,
        port: service.port,
        username: service.username,
        password: service.password,
      };
    }

    if (!connectionDetails.password) {
      throw new Error('Could not determine credentials for service.');
    }

    console.log('Public API - Service found:', {
      id: service._id,
      name: service.name,
      endpoint: req.params.procedureName
    });

    const config = {
      user: connectionDetails.username,
      password: decryptDatabasePassword(connectionDetails.password),
      server: connectionDetails.host,
      port: parseInt(connectionDetails.port),
      database: service.database,
      options: {
        encrypt: true,
        trustServerCertificate: process.env.NODE_ENV !== 'production',
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

    // Connect to database
    pool = await sql.connect(config);

    // Handle query parameters
    const request = pool.request();
    Object.entries(req.query).forEach(([key, value]) => {
      request.input(key, value);
    });

    // Execute the stored procedure
    const result = await request.execute(req.params.procedureName);

    if (!result || !result.recordset) {
      throw new Error('No results returned from stored procedure');
    }

    // Clean up date objects for JSON response
    const cleanResults = result.recordset.map(record => {
      const processedRecord = {};
      for (const [key, value] of Object.entries(record)) {
        processedRecord[key] = value instanceof Date ? value.toISOString() : value;
      }
      return processedRecord;
    });

    // Log API usage
    const apiUsage = new ApiUsage({
      service: service._id,
      endpoint: req.originalUrl,
      component: req.params.procedureName,
      role: req.application.defaultRole._id,
      application: req.application._id,
      timestamp: new Date(),
      method: req.method,
      statusCode: 200
    });

    await apiUsage.save();
    console.log('API Usage logged:', {
      service: service.name,
      endpoint: req.params.procedureName,
      application: req.application.name,
      role: req.application.defaultRole.name,
      method: req.method
    });

    res.json(cleanResults);
  } catch (error) {
    // Log failed API calls too
    if (req.service && req.application) {
      const apiUsage = new ApiUsage({
        service: req.service._id,
        endpoint: req.originalUrl,
        component: req.params.procedureName,
        role: req.application.defaultRole._id,
        application: req.application._id,
        timestamp: new Date(),
        method: req.method,
        statusCode: 500
      });
      await apiUsage.save();
    }

    console.error('Public API error:', error);
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
});

module.exports = router; 