require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const { decryptDatabasePassword } = require('../utils/encryption');

async function getConnectionDetails() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get service details
    const service = await Service.findOne({ name: 'salesdemo_staging' });
    if (!service) {
      console.error('Service not found');
      return;
    }

    // Decrypt password
    const decryptedPassword = decryptDatabasePassword(service.password);

    // Log connection details
    console.log('\nSQL Server Connection Details:');
    console.log('----------------------------');
    console.log(`Host: ${service.host}`);
    console.log(`Port: ${service.port}`);
    console.log(`Database: ${service.database}`);
    console.log(`Username: ${service.username}`);
    console.log(`Password: ${decryptedPassword}`);
    
    // Log connection string format
    console.log('\nConnection command:');
    console.log('----------------------------');
    console.log(`sqlcmd -S ${service.host},${service.port} -d ${service.database} -U ${service.username} -P "${decryptedPassword}"`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

getConnectionDetails(); 