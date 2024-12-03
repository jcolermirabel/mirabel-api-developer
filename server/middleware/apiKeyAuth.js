const Application = require('../models/Application');
const Service = require('../models/Service');

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

    console.log('Service lookup:', {
      pathParts,
      serviceIndex,
      serviceName,
      fullPath: req.path
    });

    // Find service with detailed logging
    const service = await Service.findOne({ 
      name: serviceName,
      isActive: true
    });

    console.log('Service query result:', {
      searched: serviceName,
      found: !!service,
      serviceDetails: service ? {
        id: service._id,
        name: service.name,
        isActive: service.isActive
      } : null
    });

    if (!service) {
      return res.status(404).json({ 
        message: 'Service not found',
        searched: serviceName
      });
    }

    // Add both application and service to request
    req.application = application;
    req.service = service;
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = apiKeyAuth; 