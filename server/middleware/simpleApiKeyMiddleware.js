const ApiKey = require('../models/ApiKey');
const Service = require('../models/Service');
const { logger } = require('./logger');

class AuthenticationError extends Error {
  constructor(message, statusCode, details = {}) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const simpleApiKeyMiddleware = async (req, res, next) => {
  const requestStart = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  try {
    // 1. Validate API key exists
    const apiKeyValue = req.headers['x-mirabel-developer-key'];
    if (!apiKeyValue) {
      throw new AuthenticationError('API key required', 401);
    }

    // 2. Find and validate API key in the ApiKey model
    const apiKey = await ApiKey.findOne({ 
      key: apiKeyValue, 
      isActive: true 
    }).populate('endpointId');

    if (!apiKey) {
      throw new AuthenticationError('Invalid or inactive API key', 401);
    }

    // 3. Parse URL for service and procedure
    const serviceName = req.params.serviceName;
    const procedureName = req.params.procedureName;

    if (!serviceName || !procedureName) {
      throw new AuthenticationError('Invalid API URL format', 400, {
        expectedFormat: '/api/v2/{database}/_proc/{procedure}'
      });
    }

    // 4. Find and validate service (database)
    const service = await Service.findOne({ 
      name: serviceName,
      isActive: true 
    });

    if (!service) {
      throw new AuthenticationError('Database/Service not found or inactive', 404, {
        serviceName,
        message: `Database '${serviceName}' not found. Make sure the service exists for this database.`
      });
    }

    // 5. Update last used timestamp for the API key
    apiKey.lastUsed = new Date();
    await apiKey.save();

    // Set request properties for the route handler
    req.apiKey = apiKey;
    req.service = service;
    req.procedureName = procedureName;
    
    logger.info('Simple API key authentication successful', {
      requestId,
      apiKeyId: apiKey._id,
      endpoint: apiKey.endpointId?.name || 'Unknown',
      service: service.name,
      database: service.database,
      procedure: procedureName,
      processingTime: Date.now() - requestStart
    });

    next();
  } catch (error) {
    const errorResponse = {
      message: error.message,
      requestId
    };

    if (error instanceof AuthenticationError) {
      if (error.details) {
        errorResponse.details = error.details;
      }
      
      logger.warn('Simple API key authentication failed', {
        requestId,
        error: error.message,
        details: error.details,
        processingTime: Date.now() - requestStart
      });

      return res.status(error.statusCode).json(errorResponse);
    }

    logger.error('Simple API key authentication error', {
      requestId,
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - requestStart
    });

    return res.status(500).json({
      message: 'Internal server error',
      requestId
    });
  }
};

module.exports = { simpleApiKeyMiddleware }; 