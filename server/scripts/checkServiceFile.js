require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

const checkServiceFile = async () => {
    try {
        // Read the Service model file
        const serviceModelPath = path.join(__dirname, '..', 'models', 'Service.js');
        const serviceModelContent = await fs.readFile(serviceModelPath, 'utf8');
        
        console.log('\nService Model File Contents:');
        console.log(serviceModelContent);

        // Also check if there's a virtual or pre-save hook
        const Service = require('../models/Service');
        const serviceSchema = Service.schema;
        
        console.log('\nVirtual Fields:');
        console.log(Object.keys(serviceSchema.virtuals));
        
        console.log('\nPre-save hooks:');
        const preSaveHooks = serviceSchema.s.hooks._pres.get('save');
        console.log(preSaveHooks ? preSaveHooks.map(h => h.fn.toString()) : 'None');

    } catch (error) {
        console.error('Error:', error);
    }
};

checkServiceFile(); 