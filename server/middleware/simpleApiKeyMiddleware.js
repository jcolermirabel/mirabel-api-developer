const ApiKey = require('../models/ApiKey');
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
    });

    if (!apiKey) {
      throw new AuthenticationError('Invalid or inactive API key', 401);
    }
    
    // 3. Update last used timestamp and attach key to request
    apiKey.lastUsed = new Date();
    await apiKey.save();
    
    req.apiKey = apiKey;

    logger.info('Simple API key authentication successful', {
      requestId,
      apiKeyId: apiKey._id,
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