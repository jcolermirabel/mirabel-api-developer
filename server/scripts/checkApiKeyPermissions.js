const mongoose = require('mongoose');
const Application = require('../models/Application');
const Service = require('../models/Service');
const Role = require('../models/Role');
require('dotenv').config({ path: __dirname + '/../.env' });

async function checkApiKeyPermissions(apiKey, serviceName, procedureName) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find application by API key
    const application = await Application.findOne({ apiKey })
      .populate({
        path: 'defaultRole',
        populate: { 
          path: 'permissions'
        }
      });

    if (!application) {
      console.log('❌ API Key not found');
      return false;
    }

    console.log(`✅ Application found: ${application.name}`);
    console.log(`   Active: ${application.isActive}`);

    if (!application.defaultRole) {
      console.log('❌ No default role assigned to application');
      return false;
    }

    console.log(`✅ Default role: ${application.defaultRole.name}`);
    console.log(`   Role active: ${application.defaultRole.isActive}`);

    // Find the service
    const service = await Service.findOne({ name: serviceName, isActive: true });
    if (!service) {
      console.log(`❌ Service '${serviceName}' not found or inactive`);
      return false;
    }

    console.log(`✅ Service found: ${service.name}`);
    console.log(`   Database: ${service.database}`);
    console.log(`   Service ID: ${service._id}`);

    // Check permissions
    console.log('\n📋 Checking permissions...');
    
    if (!application.defaultRole.permissions || application.defaultRole.permissions.length === 0) {
      console.log('❌ No permissions found for this role');
      return false;
    }

    console.log(`   Total permissions: ${application.defaultRole.permissions.length}`);

    // Look for matching permissions
    const matchingPermissions = application.defaultRole.permissions.filter(perm => {
      const serviceMatch = perm.serviceId && perm.serviceId.toString() === service._id.toString();
      const procedureMatch = perm.objectName === procedureName || 
                           perm.objectName === `/proc/${procedureName}` ||
                           perm.objectName === `/proc/dbo.${procedureName}`;
      
      console.log(`   Permission: ${perm.objectName} for service ${perm.serviceId}`);
      console.log(`     Service match: ${serviceMatch}`);
      console.log(`     Procedure match: ${procedureMatch}`);
      
      return serviceMatch && procedureMatch;
    });

    if (matchingPermissions.length === 0) {
      console.log(`❌ No permissions found for procedure '${procedureName}' on service '${serviceName}'`);
      console.log('\n📝 Available permissions for this role:');
      application.defaultRole.permissions.forEach(perm => {
        console.log(`   - ${perm.objectName} (Service: ${perm.serviceId})`);
      });
      return false;
    }

    console.log(`✅ Found ${matchingPermissions.length} matching permission(s)`);
    matchingPermissions.forEach(perm => {
      console.log(`   - ${perm.objectName}`);
      console.log(`     Actions: ${JSON.stringify(perm.actions)}`);
    });

    return true;

  } catch (error) {
    console.error('Error checking permissions:', error.message);
    return false;
  } finally {
    await mongoose.disconnect();
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('Usage: node checkApiKeyPermissions.js <apiKey> <serviceName> <procedureName>');
    console.error('Example: node checkApiKeyPermissions.js "your-api-key" "salesdemo_new" "api_ChargeBriteUserLookupPaywall"');
    process.exit(1);
  }

  const [apiKey, serviceName, procedureName] = args;
  
  checkApiKeyPermissions(apiKey, serviceName, procedureName)
    .then((hasPermission) => {
      console.log(`\n🎯 Result: ${hasPermission ? 'AUTHORIZED' : 'NOT AUTHORIZED'}`);
      process.exit(hasPermission ? 0 : 1);
    })
    .catch((error) => {
      console.error('Check failed:', error.message);
      process.exit(1);
    });
}

module.exports = { checkApiKeyPermissions }; 