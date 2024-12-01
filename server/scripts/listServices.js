require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');

async function listServices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const services = await Service.find({});
    console.log('\nFound Services:', services.length);
    
    services.forEach(service => {
      console.log('\nService Details:');
      console.log('---------------');
      console.log('ID:', service._id);
      console.log('Name:', service.name);
      console.log('Host:', service.host);
      console.log('Port:', service.port);
      console.log('Database:', service.database);
      console.log('Username:', service.username);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

listServices(); 