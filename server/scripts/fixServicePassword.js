require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const crypto = require('crypto');

const encryptPassword = (plaintext) => {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${encrypted}:${iv.toString('hex')}`;
};

const decryptOnce = (encryptedString) => {
  const [encrypted, iv] = encryptedString.split(':');
  const keyBuffer = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');
  const encryptedBuffer = Buffer.from(encrypted, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

async function fixServicePassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const service = await Service.findById('674a92748eb6dee851254c10');
    if (!service) {
      console.error('Service not found');
      return;
    }

    // Decrypt until we get the actual password
    let currentValue = service.password;
    while (currentValue && currentValue.includes(':')) {
      currentValue = decryptOnce(currentValue);
    }

    console.log('Original encrypted:', service.password);
    console.log('Decrypted password:', currentValue);

    // Re-encrypt once
    const newEncrypted = encryptPassword(currentValue);
    console.log('New encrypted:', newEncrypted);

    // Update the service
    service.password = newEncrypted;
    await service.save();
    console.log('Service updated successfully');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixServicePassword(); 