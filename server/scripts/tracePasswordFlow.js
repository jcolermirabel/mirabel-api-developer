require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const crypto = require('crypto');

// Mock encryption function to trace calls
const encryptPassword = (plaintext) => {
  console.log('Encryption called with:', plaintext.substring(0, 3) + '...');
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${encrypted}:${iv.toString('hex')}`;
};

async function tracePasswordFlow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create a test service
    const testService = new Service({
      name: 'test_service_' + Date.now(),
      host: 'localhost',
      port: 1433,
      database: 'test_db',
      username: 'test_user',
      password: 'test_password'
    });

    // Log pre-save
    console.log('\nBefore save:', {
      password: testService.password,
      isEncrypted: testService.password.includes(':')
    });

    // Save and log
    await testService.save();
    console.log('\nAfter save:', {
      password: testService.password,
      isEncrypted: testService.password.includes(':')
    });

    // Clean up
    await Service.deleteOne({ _id: testService._id });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

tracePasswordFlow(); 