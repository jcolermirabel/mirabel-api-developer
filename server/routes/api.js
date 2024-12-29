const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/databaseService');
const { consolidatedApiKeyMiddleware } = require('../middleware/consolidatedAuthMiddleware');
const trackApiUsage = require('../middleware/apiUsageTracker');

// Debug middleware - kept from original
router.use((req, res, next) => {
  console.log('API Route accessed:', {
    method: req.method,
    path: req.path,
    params: req.params
  });
  next();
});

router.use(consolidatedApiKeyMiddleware);
router.use(trackApiUsage);

// API v2 routes for service procedures
router.get('/v2/:serviceName/_proc/:procedureName', async (req, res) => {
  try {
    // The same connection and execution logic, just moved to DatabaseService
    const result = await DatabaseService.executeStoredProcedure(
      req.service,
      req.procedureName,
      req.query
    );
    
    res.json(result);
  } catch (error) {
    // Keeping the same detailed error logging
    console.error('Procedure execution error:', {
      error: error.message,
      code: error.code,
      procedure: req.procedureName,
      service: req.service?.name
    });
    res.status(500).json({ 
      message: 'Failed to execute procedure',
      error: error.message
    });
  }
});

// Update the test connection endpoint to test both hosts
router.post('/services/test', async (req, res) => {
  try {
    const { host, failoverHost, port, database, username, password } = req.body;
    
    // Test primary host
    try {
      const primaryConfig = {
        host,
        port,
        database,
        username,
        password
      };
      // Your existing connection test logic here
      await testConnection(primaryConfig);
      return res.json({ success: true, message: 'Primary connection successful' });
    } catch (primaryError) {
      // If primary fails and failover exists, test failover
      if (failoverHost) {
        try {
          const failoverConfig = {
            host: failoverHost,
            port,
            database,
            username,
            password
          };
          await testConnection(failoverConfig);
          return res.json({ success: true, message: 'Failover connection successful' });
        } catch (failoverError) {
          return res.status(400).json({
            error: 'Both connections failed',
            primary: primaryError.message,
            failover: failoverError.message
          });
        }
      }
      return res.status(400).json({ error: primaryError.message });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;