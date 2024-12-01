// consolidatedAuthMiddleware.js

const Application = require('../models/Application');
const Service = require('../models/Service');
const Role = require('../models/Role');
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

const validateDatabaseConnection = () => {
  const mongooseState = mongoose.connection.readyState;
  if (mongooseState !== 1) {
    throw new AuthenticationError(
      'Database service unavailable',
      503,
      { state: mongooseState }
    );
  }
};

const extractAndValidateApiKey = (headers) => {
  const apiKey = headers['x-mirabel-api'];
  if (!apiKey) {
    throw new AuthenticationError('API key required', 401);
  }
  return apiKey;
};

const validateApplication = async (apiKey) => {
  const application = await Application.findOne({ apiKey })
    .populate({
      path: 'defaultRole',
      populate: { 
        path: 'permissions',
        match: { isActive: true }
      }
    })
    .exec();

  if (!application) {
    throw new AuthenticationError('Invalid API key', 401);
  }

  if (!application.isActive) {
    throw new AuthenticationError('Application is inactive', 403);
  }

  if (!application.defaultRole) {
    throw new AuthenticationError('No role associated with this application', 403);
  }

  if (!application.defaultRole.isActive) {
    throw new AuthenticationError('Role is inactive', 403);
  }

  return application;
};

const validateService = async (application, requestedService) => {
  if (!application.defaultRole.permissions?.length) {
    throw new AuthenticationError('No permissions associated with this role', 403, {
      roleId: application.defaultRole._id
    });
  }

  // Find service from permissions
  const serviceIds = [...new Set(application.defaultRole.permissions
    .map(perm => perm.service?.toString())
    .filter(Boolean))];

  const services = await Service.find({
    _id: { $in: serviceIds },
    isActive: true
  });

  if (!services.length) {
    throw new AuthenticationError('No active services found for this role', 403);
  }

  const matchingService = services.find(s => s.name === requestedService);
  if (!matchingService) {
    throw new AuthenticationError('Invalid service for this API key', 403, {
      requestedService,
      authorizedServices: services.map(s => s.name)
    });
  }

  return matchingService;
};

const validateEndpointPermission = (application, endpoint, method) => {
  const hasPermission = application.defaultRole.permissions.some(perm => 
    perm.objectName === endpoint && 
    perm.actions && 
    perm.actions[method.toUpperCase()]
  );

  if (!hasPermission) {
    throw new AuthenticationError('Insufficient permissions', 403, {
      endpoint,
      method,
      availablePermissions: application.defaultRole.permissions
        .map(p => ({ 
          objectName: p.objectName, 
          actions: Object.keys(p.actions).filter(k => p.actions[k])
        }))
    });
  }
};

const consolidatedApiKeyMiddleware = async (req, res, next) => {
  const requestStart = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  try {
    // Step 1: Validate database connection
    validateDatabaseConnection();

    // Step 2: Extract and validate API key
    const apiKey = extractAndValidateApiKey(req.headers);

    // Step 3: Validate application and role
    const application = await validateApplication(apiKey);

    // Step 4: Extract service name from path
    const pathParts = req.path.split('/');
    const serviceIndex = pathParts.indexOf('services');
    const requestedService = serviceIndex >= 0 ? pathParts[serviceIndex + 1] : null;

    // Step 5: Validate service
    const service = await validateService(application, requestedService);

    // Step 6: Validate endpoint permission
    const endpoint = req.params.endpoint || pathParts[pathParts.length - 1];
    validateEndpointPermission(application, endpoint, req.method);

    // Step 7: Attach validated entities to request
    req.application = application;
    req.service = service;
    req.authContext = {
      requestId,
      timestamp: new Date(),
      processingTime: Date.now() - requestStart
    };

    // Log successful authentication
    logger.info('Authentication successful', {
      requestId,
      application: application.name,
      service: service.name,
      endpoint,
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

    // Handle unexpected errors
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