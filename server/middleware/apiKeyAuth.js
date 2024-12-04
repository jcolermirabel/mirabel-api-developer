const Application = require('../models/Application');
const Service = require('../models/Service');
const Role = require('../models/Role');

const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-mirabel-api'];
    
    if (!apiKey) {
      return res.status(401).json({ message: 'API key required' });
    }

    // Find application by API key
    const application = await Application.findOne({ 
      apiKey: apiKey,
      isActive: true
    });

    if (!application) {
      return res.status(403).json({ message: 'Invalid API key' });
    }

    // Extract service name from path
    const pathParts = req.path.split('/');
    const serviceIndex = pathParts.indexOf('v2');
    const serviceName = serviceIndex >= 0 ? pathParts[serviceIndex + 1] : null;

    // Find service
    const service = await Service.findOne({ 
      name: serviceName,
      isActive: true
    });

    if (!service) {
      return res.status(404).json({ 
        message: 'Service not found',
        searched: serviceName
      });
    }

    // Find role with permission for this endpoint
    const procedureName = req.params.procedureName;
    const objectName = `/proc/dbo.${procedureName}`;

    const role = await Role.findOne({
      'permissions.serviceId': service._id,
      'permissions.objectName': objectName,
      isActive: true
    });

    if (!role) {
      return res.status(403).json({ 
        message: 'Access denied - Role does not have permission for this endpoint',
        endpoint: objectName
      });
    }

    // Add application and service to request
    req.application = application;
    req.service = service;
    req.role = role;
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = apiKeyAuth; 