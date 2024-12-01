require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const crypto = require('crypto');

// Add decryption function directly in script
const decryptPassword = (encryptedPassword) => {
  try {
    const [password, iv] = encryptedPassword.split(':');
    
    console.log('Decryption attempt:', {
      encryptionKey: process.env.ENCRYPTION_KEY?.length,
      password: password.length,
      iv: iv?.length
    });

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
      Buffer.from(iv, 'hex')
    );

    let decrypted = decipher.update(Buffer.from(password, 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
};

async function getConnectionDetails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const service = await Service.findOne({ name: 'salesdemo_staging' });
    if (!service) {
      console.error('Service not found');
      return;
    }

    console.log('Encrypted password:', service.password);
    const decryptedPassword = decryptPassword(service.password);
    console.log('Decrypted password:', decryptedPassword);

    console.log('\nSQL Server Connection Details:');
    console.log('----------------------------');
    console.log(`Host: ${service.host}`);
    console.log(`Port: ${service.port}`);
    console.log(`Database: ${service.database}`);
    console.log(`Username: ${service.username}`);
    console.log(`Password: ${decryptedPassword}`);
    
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