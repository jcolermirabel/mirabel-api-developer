require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const crypto = require('crypto');

const decryptPassword = (encryptedString) => {
  try {
    // Split the encrypted string into password and IV
    const lastColon = encryptedString.lastIndexOf(':');
    const encryptedPassword = encryptedString.slice(0, lastColon);
    const iv = encryptedString.slice(lastColon + 1);

    console.log('Decryption components:', {
      encryptedLength: encryptedString.length,
      passwordPart: encryptedPassword.length,
      ivPart: iv.length,
      key: process.env.ENCRYPTION_KEY
    });

    // Create buffers
    const keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    const encryptedBuffer = Buffer.from(encryptedPassword, 'hex');

    console.log('Buffer sizes:', {
      key: keyBuffer.length,
      iv: ivBuffer.length,
      encrypted: encryptedBuffer.length
    });

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
    
    // Decrypt
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption failed:', error);
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