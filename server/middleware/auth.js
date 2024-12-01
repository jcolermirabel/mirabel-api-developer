const jwt = require('jsonwebtoken');
const Application = require('../models/Application');
const mongoose = require('mongoose');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const apiKeyMiddleware = async (req, res, next) => {
  const mongooseState = mongoose.connection.readyState;
  if (mongooseState !== 1) {
    console.error('MongoDB not connected. Current state:', mongooseState);
    return res.status(503).json({ 
      message: 'Database service unavailable',
      state: mongooseState 
    });
  }

  const apiKey = req.headers['x-mirabel-api'];
  const requestedService = req.params.serviceId;

  if (!apiKey) {
    return res.status(401).json({ message: 'API key required' });
  }

  try {
    const application = await Application.findOne({ apiKey })
      .populate({
        path: 'defaultRole',
        populate: { path: 'permissions' }
      })
      .exec();

    if (!application) {
      return res.status(401).json({ message: 'Invalid API key' });
    }

    if (!application.isActive) {
      return res.status(403).json({ message: 'Application is inactive' });
    }

    const serviceId = application.defaultRole.permissions[0]?.service;
    if (!serviceId) {
      return res.status(403).json({ 
        message: 'No service associated with this role',
        roleId: application.defaultRole._id
      });
    }

    const Service = require('../models/Service');
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return res.status(403).json({ 
        message: 'Service not found',
        serviceId
      });
    }

    if (!service.isActive) {
      return res.status(403).json({ message: 'Service is inactive' });
    }

    const Role = require('../models/Role');
    const role = await Role.findById(application.defaultRole._id);
    
    if (!role.isActive) {
      return res.status(403).json({ message: 'Role is inactive' });
    }

    if (service.name !== requestedService) {
      return res.status(403).json({ 
        message: 'Invalid service for this API key',
        requestedService,
        authorizedService: service.name
      });
    }

    req.application = application;
    
    const endpoint = req.params.endpoint;
    const hasPermission = application.defaultRole.permissions.some(perm => 
      perm.objectName === endpoint && perm.actions.GET
    );

    if (!hasPermission) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        endpoint,
        availablePermissions: application.defaultRole.permissions.map(p => p.objectName)
      });
    }

    next();
  } catch (error) {
    console.error('API Key Authentication Error:', error);
    return res.status(500).json({ 
      message: 'Authentication failed', 
      error: error.message 
    });
  }
};

module.exports = { authMiddleware, apiKeyMiddleware }; 