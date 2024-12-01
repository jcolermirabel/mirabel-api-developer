require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const crypto = require('crypto');

// Add decryption function directly in script
const decryptPassword = (encryptedPassword) => {
  try {
    const [password, iv] = encryptedPassword.split(':');
    
    console.log('Decryption details:', {
      encryptionKey: process.env.ENCRYPTION_KEY,
      encryptionKeyLength: process.env.ENCRYPTION_KEY?.length,
      passwordLength: password?.length,
      ivLength: iv?.length
    });

    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not found in environment');
    }

    const keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    
    console.log('Buffer lengths:', {
      keyBuffer: keyBuffer.length,
      ivBuffer: ivBuffer.length
    });

    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
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