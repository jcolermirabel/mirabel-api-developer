const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const ApiUsage = require('../models/ApiUsage');
const sql = require('mssql');
const { decryptDatabasePassword } = require('../utils/encryption');

// Public API endpoint handler
router.get('/services/:serviceId/:endpoint', async (req, res) => {
  let pool;
  try {
    console.log('Public API - Request received:', {
      params: req.params,
      query: req.query,
      headers: {
        'x-mirabel-api': req.headers['x-mirabel-api'] ? 'present' : 'missing',
        'accept': req.headers['accept']
      }
    });

    console.log('Public API - Looking for service:', {
      serviceId: req.params.serviceId,
      endpoint: req.params.endpoint
    });

    // First try exact match
    let service = await Service.findOne({ 
      name: req.params.serviceId,
      isActive: true
    });

    // If not found, try case-insensitive match
    if (!service) {
      service = await Service.findOne({ 
        name: { $regex: new RegExp(`^${req.params.serviceId}$`, 'i') },
        isActive: true
      });
    }

    console.log('Public API - Raw service data:', service);

    console.log('Public API - Service lookup result:', {
      found: !!service,
      serviceName: service?.name,
      serviceId: service?._id,
      isActive: service?.isActive,
      host: service?.host,
      port: service?.port,
      database: service?.database
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found or inactive' });
    }

    console.log('Public API - Service found:', {
      id: service._id,
      name: service.name,
      endpoint: req.params.endpoint
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

    // Connect to database
    pool = await sql.connect(config);

    // Handle query parameters
    const request = pool.request();
    Object.entries(req.query).forEach(([key, value]) => {
      request.input(key, value);
    });

    // Execute the stored procedure
    const result = await request.execute(req.params.endpoint);

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
      component: req.params.endpoint,
      role: req.application.defaultRole._id,
      application: req.application._id,
      timestamp: new Date(),
      method: req.method,
      statusCode: 200
    });

    await apiUsage.save();
    console.log('API Usage logged:', {
      service: service.name,
      endpoint: req.params.endpoint,
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
        component: req.params.endpoint,
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