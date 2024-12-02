require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');

async function traceEncryption() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the service model
    const ServiceSchema = mongoose.model('Service').schema;
    
    // Check for pre-save hooks
    console.log('\nPre-save middleware:');
    console.log(ServiceSchema.pre);
    
    // Check for password field options
    console.log('\nPassword field options:');
    console.log(ServiceSchema.path('password'));
    
    // Check for any virtual fields
    console.log('\nVirtual fields:');
    console.log(ServiceSchema.virtuals);

    // Check service methods
    console.log('\nService methods:');
    console.log(Object.keys(ServiceSchema.methods));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

traceEncryption(); 