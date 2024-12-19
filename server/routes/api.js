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

module.exports = router;