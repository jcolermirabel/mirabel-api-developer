require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const { decryptDatabasePassword } = require('../utils/encryption');

async function checkEncryption() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get service by ID for testing
    const service = await Service.findById('674a92748eb6dee851254c10');
    if (!service) {
      console.error('Test service not found');
      return;
    }

    console.log('\nService Details:');
    console.log('---------------');
    console.log('Name:', service.name);
    console.log('Host:', service.host);
    console.log('Port:', service.port);
    console.log('Database:', service.database);

    // Log encryption details
    console.log('\nEncryption Environment:');
    console.log('----------------------');
    console.log('ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY);
    console.log('Key length:', process.env.ENCRYPTION_KEY?.length);

    // Log encrypted password details
    console.log('\nEncrypted Password Details:');
    console.log('-------------------------');
    console.log('Raw encrypted:', service.password);
    const [encryptedPart, iv] = service.password.split(':');
    console.log('Parts:', {
      encrypted: encryptedPart,
      encryptedLength: encryptedPart?.length,
      iv: iv,
      ivLength: iv?.length
    });

    // Try decryption
    console.log('\nAttempting Decryption...');
    const decrypted = decryptDatabasePassword(service.password);
    console.log('Decrypted result:', decrypted);
    console.log('Decrypted length:', decrypted?.length);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkEncryption(); 