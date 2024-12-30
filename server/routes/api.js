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
    params: req.params,
    query: req.query,
    body: req.body
  });
  next();
});

// API v2 routes for service procedures
router.all('/v2/:serviceName/_proc/:procedureName', consolidatedApiKeyMiddleware, trackApiUsage, async (req, res) => {
  try {
    console.log('Executing procedure:', {
      service: req.service?.name,
      procedure: req.procedureName,
      params: req.method === 'GET' ? req.query : req.body
    });

    const result = await DatabaseService.executeStoredProcedure(
      req.service,
      req.procedureName,
      req.method === 'GET' ? req.query : req.body
    );
    
    res.json(result);
  } catch (error) {
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