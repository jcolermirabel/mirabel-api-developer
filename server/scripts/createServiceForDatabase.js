const mongoose = require('mongoose');
const Service = require('../models/Service');
const Connection = require('../models/Connection');
require('dotenv').config({ path: __dirname + '/../.env' });

async function createServiceForDatabase(connectionName, databaseName, serviceName = null) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the connection
    const connection = await Connection.findOne({ name: connectionName, isActive: true });
    if (!connection) {
      throw new Error(`Connection '${connectionName}' not found or inactive`);
    }

    console.log(`Found connection: ${connection.name} (${connection.host}:${connection.port})`);

    // Use provided service name or default to database name
    const finalServiceName = serviceName || databaseName;

    // Check if service already exists
    const existingService = await Service.findOne({ name: finalServiceName });
    if (existingService) {
      console.log(`Service '${finalServiceName}' already exists with ID: ${existingService._id}`);
      return existingService;
    }

    // Create the service
    const service = new Service({
      name: finalServiceName,
      database: databaseName,
      connectionId: connection._id,
      isActive: true,
      createdBy: null // You might want to set this to an admin user ID
    });

    await service.save();
    console.log(`Service created successfully:`);
    console.log(`- Service Name: ${service.name}`);
    console.log(`- Database: ${service.database}`);
    console.log(`- Connection: ${connection.name}`);
    console.log(`- Service ID: ${service._id}`);

    return service;

  } catch (error) {
    console.error('Error creating service:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node createServiceForDatabase.js <connectionName> <databaseName> [serviceName]');
    console.error('Example: node createServiceForDatabase.js "My SQL Server" "salesdemo_new" "salesdemo_new"');
    process.exit(1);
  }

  const [connectionName, databaseName, serviceName] = args;
  
  createServiceForDatabase(connectionName, databaseName, serviceName)
    .then(() => {
      console.log('Service creation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Service creation failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createServiceForDatabase }; 