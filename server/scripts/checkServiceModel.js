require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');

const checkServiceModel = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get the service schema
        const serviceSchema = Service.schema;
        
        console.log('\nService Schema Methods:');
        console.log(Object.keys(serviceSchema.methods));
        
        console.log('\nService Schema Statics:');
        console.log(Object.keys(serviceSchema.statics));
        
        // Get an instance
        const service = await Service.findOne({ name: 'icoler' });
        console.log('\nService Instance Methods:');
        console.log(Object.keys(service.__proto__));
        
        // Check if there's any middleware
        console.log('\nSchema Middleware:');
        console.log('Pre:', serviceSchema.s.hooks._pres);
        console.log('Post:', serviceSchema.s.hooks._posts);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkServiceModel(); 