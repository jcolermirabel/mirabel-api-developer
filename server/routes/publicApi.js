const express = require('express');
const router = express.Router();
const sql = require('mssql');
const Connection = require('../models/Connection');
const ApiUsage = require('../models/ApiUsage');
const { decryptDatabasePassword } = require('../utils/encryption');
const { simpleApiKeyMiddleware } = require('../middleware/simpleApiKeyMiddleware');

// Public API endpoint handler for stored procedures (GET and POST)
router.get('/:serviceName/_proc/:procedureName', simpleApiKeyMiddleware, async (req, res) => {
  await handleProcedureRequest(req, res);
});

router.post('/:serviceName/_proc/:procedureName', simpleApiKeyMiddleware, async (req, res) => {
  await handleProcedureRequest(req, res);
});

async function handleProcedureRequest(req, res) {
  let pool;
  try {
    const databaseName = req.params.serviceName;
    const procedureName = req.params.procedureName;

    // Find a connection that is authorized for the requested database
    const connection = await Connection.findOne({
      databases: databaseName,
      isActive: true
    }).select('+password');

    if (!connection) {
      return res.status(404).json({ 
        message: `Configuration error: No active connection found for database '${databaseName}'.` 
      });
    }

    req.connection = connection; // Attach connection to request for logging purposes

    console.log('Public API - Request received for:', {
      connection: connection.name,
      database: databaseName,
      procedure: procedureName,
      params: req.query,
      body: req.body
    });

    const config = {
      user: connection.username,
      password: decryptDatabasePassword(connection.password),
      server: connection.host,
      port: parseInt(connection.port),
      database: databaseName,
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

    // Handle parameters from both query string (GET) and request body (POST)
    const parameters = { ...req.query, ...req.body };

    // Handle query parameters
    const request = pool.request();
    Object.entries(parameters).forEach(([key, value]) => {
      request.input(key, value);
    });

    // Execute the stored procedure
    const result = await request.execute(procedureName);

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

    // Log API usage (simplified for endpoint-based API keys)
    const apiUsage = new ApiUsage({
      connectionId: connection._id,
      endpoint: req.originalUrl,
      component: procedureName,
      timestamp: new Date(),
      method: req.method,
      statusCode: 200
    });

    await apiUsage.save();
    console.log('API Usage logged:', {
      service: connection.name,
      endpoint: req.params.procedureName,
      method: req.method
    });

    res.json(cleanResults);
  } catch (error) {
    // Log failed API calls too
    if (req.apiKey) {
      const apiUsage = new ApiUsage({
        connectionId: req.connection ? req.connection._id : undefined,
        endpoint: req.originalUrl,
        component: req.params.procedureName,
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
}

module.exports = router; 