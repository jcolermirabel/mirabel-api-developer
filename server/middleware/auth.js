const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const Service = require('../models/Service');

const authMiddleware = (req, res, next) => {
  try {
    console.log('Auth headers:', req.headers);
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

const authenticateApiKey = async (req, res, next) => {
  try {
    // ... existing API key validation ...
    
    const service = await Service.findById(application.service);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Get the effective host using the failover logic
    try {
      const effectiveHost = await service.getEffectiveHost();
      
      // Add the effective host to the request for use in the route handlers
      req.effectiveHost = effectiveHost;
      req.service = {
        ...service.toObject(),
        host: effectiveHost // Override the host with the effective one
      };
      
      next();
    } catch (error) {
      return res.status(503).json({ 
        error: 'Service unavailable', 
        details: error.message 
      });
    }
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = { authMiddleware, authenticateApiKey }; 