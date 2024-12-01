require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const crypto = require('crypto');

const decryptOnce = (encryptedString) => {
  try {
    const [encrypted, iv] = encryptedString.split(':');
    
    console.log('Decryption attempt:', {
      encryptedLength: encrypted.length,
      ivLength: iv.length,
      hasMoreColons: encrypted.includes(':')
    });

    const keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    const encryptedBuffer = Buffer.from(encrypted, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

async function checkEncryption() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const service = await Service.findById('674a92748eb6dee851254c10');
    if (!service) {
      console.error('Test service not found');
      return;
    }

    let currentValue = service.password;
    let decryptionCount = 0;

    while (currentValue && currentValue.includes(':')) {
      decryptionCount++;
      console.log(`\nDecryption attempt ${decryptionCount}:`);
      console.log('-'.repeat(20));
      currentValue = decryptOnce(currentValue);
    }

    console.log('\nFinal result:', {
      decryptionCount,
      finalValue: currentValue,
      stillEncrypted: currentValue?.includes(':') || false
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkEncryption(); 