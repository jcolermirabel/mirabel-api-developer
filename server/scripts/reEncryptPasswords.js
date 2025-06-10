const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const Connection = require('../models/Connection');
const Service = require('../models/Service');
const { encryptDatabasePassword, decryptDatabasePassword } = require('../utils/encryption');

async function reEncryptPasswords() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in the .env file');
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Re-encrypt Connection passwords
    const connections = await Connection.find({
      password: { $exists: true, $ne: null, $ne: "" }
    });
    console.log(`Found ${connections.length} connections with passwords to re-encrypt.`);
    for (const connection of connections) {
      console.log(`Processing connection: ${connection.name}`);
      // The pre-save middleware will handle re-encryption
      connection.markModified('password');
      await connection.save();
      console.log(`Re-encrypted password for Connection: ${connection.name}`);
    }

    // Re-encrypt Service passwords
    const services = await Service.find({ 
      password: { $exists: true, $ne: null, $ne: "" } 
    });
    console.log(`Found ${services.length} services with passwords to re-encrypt.`);
    for (const service of services) {
        console.log(`Processing service: ${service.name}`);
        // The pre-save middleware will handle re-encryption
        service.markModified('password');
        await service.save();
        console.log(`Re-encrypted password for Service: ${service.name}`);
    }

    console.log('All passwords have been re-encrypted successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error re-encrypting passwords:', error);
    process.exit(1);
  }
}

reEncryptPasswords(); 