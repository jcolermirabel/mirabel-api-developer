const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth');
const ApiUsage = require('../models/ApiUsage');

// Debug middleware specific to API routes
router.use((req, res, next) => {
  console.log('API Route accessed:', {
    method: req.method,
    path: req.path,
    params: req.params
  });
  next();
});

// API v2 routes for service procedures
router.get('/v2/:serviceName/_proc/:procedureName', apiKeyAuth, async (req, res) => {
  console.log('Procedure route hit:', {
    path: req.path,
    serviceName: req.params.serviceName,
    procedureName: req.params.procedureName
  });
  
  try {
    const { serviceName, procedureName } = req.params;
    const service = req.service; // From apiKeyAuth middleware
    const application = req.application; // From apiKeyAuth middleware
    
    if (!service.executeProcedure) {
      console.error('Service missing executeProcedure method:', service);
      return res.status(500).json({ message: 'Service configuration error' });
    }
    
    const result = await service.executeProcedure(procedureName);
    
    // Log the API usage
    await ApiUsage.create({
      service: service._id,
      endpoint: req.path,
      component: procedureName,
      application: application._id,
      timestamp: new Date(),
      method: req.method,
      statusCode: 200
    });

    res.json(result);
  } catch (error) {
    console.error('API execution error:', error);
    
    // Log failed attempts too
    if (req.service && req.application) {
      await ApiUsage.create({
        service: req.service._id,
        endpoint: req.path,
        component: req.params.procedureName,
        application: req.application._id,
        timestamp: new Date(),
        method: req.method,
        statusCode: 500
      });
    }

    res.status(500).json({ 
      message: 'Error executing API request',
      error: error.message 
    });
  }
});

module.exports = router; 