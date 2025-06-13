const mongoose = require('mongoose');
const Service = require('../models/Service');
const Connection = require('../models/Connection');
require('dotenv').config({ path: __dirname + '/../.env' });

async function updateServiceConnection(serviceName, newConnectionName) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the service
    const service = await Service.findOne({ name: serviceName });
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`);
    }

    console.log(`✅ Service found: ${service.name}`);
    console.log(`   Current connection ID: ${service.connectionId}`);

    // Find the new connection
    const newConnection = await Connection.findOne({ name: newConnectionName, isActive: true });
    if (!newConnection) {
      throw new Error(`Connection '${newConnectionName}' not found or inactive`);
    }

    console.log(`✅ New connection found: ${newConnection.name}`);
    console.log(`   Host: ${newConnection.host}:${newConnection.port}`);
    console.log(`   Username: ${newConnection.username}`);

    // Update the service
    const oldConnectionId = service.connectionId;
    service.connectionId = newConnection._id;
    await service.save();

    console.log(`✅ Service updated successfully!`);
    console.log(`   Service: ${service.name}`);
    console.log(`   Old connection ID: ${oldConnectionId}`);
    console.log(`   New connection ID: ${newConnection._id}`);
    console.log(`   New connection: ${newConnection.name}`);

    return service;

  } catch (error) {
    console.error('❌ Error updating service:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node updateServiceConnection.js <serviceName> <newConnectionName>');
    console.error('Example: node updateServiceConnection.js "salesdemo_new" "AWSSQL4"');
    process.exit(1);
  }

  const [serviceName, newConnectionName] = args;
  
  updateServiceConnection(serviceName, newConnectionName)
    .then(() => {
      console.log('\n🎯 Service connection updated successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Update failed:', error.message);
      process.exit(1);
    });
}

module.exports = { updateServiceConnection }; 