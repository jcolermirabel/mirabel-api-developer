const Application = require('../models/Application');
const Service = require('../models/Service');

const apiKeyAuth = async (req, res, next) => {
  try {
    console.log('API Key Auth - Request:', {
      method: req.method,
      path: req.path,
      params: req.params,
      query: req.query,
      headers: {
        'x-mirabel-api': req.headers['x-mirabel-api'] ? 'present' : 'missing'
      }
    });

    const apiKey = req.headers['x-mirabel-api'];
    
    if (!apiKey) {
      return res.status(401).json({ message: 'API key required' });
    }

    // Find application by API key
    const application = await Application.findOne({ 
      apiKey: apiKey,
      isActive: true
    }).populate({
      path: 'defaultRole',
      match: { isActive: true }
    });

    console.log('API Key Auth - Application:', {
      found: !!application,
      name: application?.name,
      hasRole: !!application?.defaultRole
    });

    if (!application || !application.defaultRole) {
      return res.status(403).json({ message: 'Invalid API key or inactive application' });
    }

    // Extract service name from path
    const pathParts = req.path.split('/');
    const serviceIndex = pathParts.indexOf('services');
    const serviceName = serviceIndex >= 0 ? pathParts[serviceIndex + 1] : null;

    console.log('API Key Auth - Path analysis:', {
      path: req.path,
      pathParts,
      serviceIndex,
      serviceName
    });

    // Find service
    const service = await Service.findOne({ 
      name: serviceName,
      isActive: true
    });

    console.log('API Key Auth - Service:', {
      found: !!service,
      name: service?.name,
      id: service?._id
    });

    if (!service) {
      return res.status(404).json({ message: 'Service not found or inactive' });
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