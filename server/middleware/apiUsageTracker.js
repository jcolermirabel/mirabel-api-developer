const ApiUsage = require('../models/ApiUsage');
const Service = require('../models/Service');

const trackApiUsage = async (req, res, next) => {
 const originalJson = res.json;
 
 res.json = function(data) {
   try {
     const application = req.application?._id;
     const role = req.role?._id || req.application?.defaultRole?._id;

     console.log('Role being saved:', role);
     console.log('req.role:', req.role);
     console.log('req.application.defaultRole:', req.application?.defaultRole);

     const fullUrl = new URL(req.originalUrl, `http://${req.headers.host}`);
     const pathWithoutQuery = fullUrl.pathname;
     const pathParts = pathWithoutQuery.split('/').filter(Boolean);
     
     const isV2Path = pathParts.includes('v2');
     const componentName = isV2Path ? 
       pathParts[pathParts.length - 1] :
       pathParts[pathParts.length - 1].toLowerCase();

     const usageData = {
       timestamp: new Date(),
       endpoint: pathWithoutQuery,
       component: componentName,
       method: req.method,
       application: application,
       role: role,
       statusCode: res.statusCode || 200
     };

     if (req.service?._id) {
       usageData.service = req.service._id;
       ApiUsage.create(usageData);
     } else {
       const serviceName = isV2Path ? 
         pathParts[pathParts.indexOf('v2') + 1] : 
         req.params.serviceId;
         
       Service.findOne({ name: serviceName })
         .then(service => {
           if (service) {
             usageData.service = service._id;
             return ApiUsage.create(usageData);
           }
         });
     }

     return originalJson.call(this, data);
   } catch (error) {
     return originalJson.call(this, data);
   }
 };
 
 next();
};

module.exports = trackApiUsage;