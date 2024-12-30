const Application = require('../models/Application');
const Service = require('../models/Service');
const mongoose = require('mongoose');
const { logger } = require('./logger');

class AuthenticationError extends Error {
  constructor(message, statusCode, details = {}) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const consolidatedApiKeyMiddleware = async (req, res, next) => {
  const requestStart = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  try {
    // 1. Validate API key exists
    const apiKey = req.headers['x-mirabel-api'];
    if (!apiKey) {
      throw new AuthenticationError('API key required', 401);
    }

    // 2. Find and validate application
    const application = await Application.findOne({ apiKey })
      .populate({
        path: 'defaultRole',
        populate: { 
          path: 'permissions'
        }
      })
      .exec();

    if (!application || !application.isActive) {
      throw new AuthenticationError('Invalid or inactive API key', 401);
    }

    if (!application.defaultRole || !application.defaultRole.isActive) {
      throw new AuthenticationError('No active role associated with this application', 403);
    }

    // 3. Parse URL for service and procedure
    const serviceName = req.params.serviceName;
    const procedureName = req.params.procedureName;

    if (!serviceName || !procedureName) {
      throw new AuthenticationError('Invalid API URL format', 400, {
        expectedFormat: '/api/v2/{service}/_proc/{procedure}'
      });
    }

    // 4. Find and validate service
    const service = await Service.findOne({ 
      name: serviceName,
      isActive: true 
    });

    if (!service) {
      throw new AuthenticationError('Service not found or inactive', 404, {
        serviceName
      });
    }

    // 5. Validate procedure permission
    // Check if the role has permission for this procedure and service
    const hasPermission = application.defaultRole.permissions.some(perm => 
      perm.serviceId.toString() === service._id.toString() && // Match service
      (perm.objectName === procedureName || // Match procedure name directly
       perm.objectName === `/proc/${procedureName}`) && // Match with /proc/ prefix
      perm.actions && 
      perm.actions[req.method] // Check method permission
    );

    if (!hasPermission) {
      throw new AuthenticationError('Insufficient permissions', 403, {
        procedure: procedureName,
        service: serviceName,
        method: req.method
      });
    }

    // Set consistent request properties
    req.application = application;
    req.service = service;
    req.role = application.defaultRole;
    req.procedureName = procedureName;
    
    logger.info('Authentication successful', {
      requestId,
      application: application.name,
      service: service.name,
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
      
      logger.warn('Authentication failed', {
        requestId,
        error: error.message,
        details: error.details,
        processingTime: Date.now() - requestStart
      });

      return res.status(error.statusCode).json(errorResponse);
    }

    logger.error('Authentication error', {
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

module.exports = { consolidatedApiKeyMiddleware };