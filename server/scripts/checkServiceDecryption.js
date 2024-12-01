require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const crypto = require('crypto');

const decryptOnce = (encryptedString) => {
  const [encrypted, iv] = encryptedString.split(':');
  
  console.log('Decryption step:', {
    encryptedLength: encrypted.length,
    ivLength: iv.length
  });

  const keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');
  const encryptedBuffer = Buffer.from(encrypted, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString();
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

    console.log('\nFirst Decryption:');
    console.log('----------------');
    const firstPass = decryptOnce(service.password);
    console.log('Result:', firstPass);

    if (firstPass.includes(':')) {
      console.log('\nSecond Decryption:');
      console.log('----------------');
      const finalPass = decryptOnce(firstPass);
      console.log('Final result:', finalPass);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkEncryption(); 