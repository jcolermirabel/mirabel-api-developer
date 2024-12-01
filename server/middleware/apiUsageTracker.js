const ApiUsage = require('../models/ApiUsage');
const Service = require('../models/Service');
const Role = require('../models/Role');

const trackApiUsage = async (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    try {
      const application = req.application?._id;
      const role = req.application?.defaultRole?._id;
      
      const fullUrl = new URL(req.originalUrl, `http://${req.headers.host}`);
      const pathWithoutQuery = fullUrl.pathname;
      
      // Extract the component name from the path
      const pathParts = pathWithoutQuery.split('/').filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1].toLowerCase();

      Promise.all([
        Service.findOne({ name: req.params.serviceId }),
        Role.findById(role)
      ])
        .then(([service, roleDoc]) => {
          if (service && roleDoc) {
            // Find the matching permission by objectName (case-insensitive)
            const permission = roleDoc.permissions.find(p => 
              p.objectName.toLowerCase() === lastPart ||
              p.objectName.toLowerCase() === `api_${lastPart}`
            );

            return ApiUsage.create({
              timestamp: new Date(),
              endpoint: pathWithoutQuery,
              component: permission?.objectName || lastPart,
              method: req.method,
              service: service._id,
              role: role,
              application: application,
              statusCode: res.statusCode || 200
            });
          }
        })
        .catch(error => {
          console.error('Error tracking API usage:', error);
        });
      
      return originalJson.call(this, data);
    } catch (error) {
      console.error('Error in API usage tracking:', error);
      return originalJson.call(this, data);
    }
  };
  
  next();
};

module.exports = trackApiUsage; 