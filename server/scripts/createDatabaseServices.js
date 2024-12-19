const mongoose = require('mongoose');
const crypto = require('crypto');
const Service = require('../models/Service');
const Role = require('../models/Role');
const Application = require('../models/Application');
require('dotenv').config({ path: __dirname + '/../.env' });

async function createServicesFromDatabases(databaseString) {
    const databases = databaseString.split(',').map(db => db.trim());
    const results = [];

    for (const dbName of databases) {
        try {
            // Generate API key
            const apiKey = crypto.randomBytes(32).toString('hex');
            
            // Create service
            const service = await Service.create({
                name: dbName,
                description: `Service for ${dbName} database`,
                status: 'active'
            });

            // Create role
            const role = await Role.create({
                name: `${dbName}_admin`,
                permissions: ['read', 'write'],
                serviceId: service._id
            });

            // Create application with API key
            const application = await Application.create({
                name: `${dbName}_app`,
                apiKey: apiKey,
                serviceId: service._id,
                roleId: role._id
            });

            results.push({
                database: dbName,
                serviceId: service._id,
                roleId: role._id,
                applicationId: application._id,
                apiKey: apiKey
            });

        } catch (error) {
            console.error(`Error processing database ${dbName}:`, error);
        }
    }

    return results;
}

async function init() {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI not found in environment variables');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    
    const databaseString = process.argv[2];
    
    if (!databaseString) {
        console.error('Please provide database names as a comma-separated string');
        console.error('Example: node createDatabaseServices.js "db1,db2,db3"');
        process.exit(1);
    }
    
    const results = await createServicesFromDatabases(databaseString);
    console.table(results);
    
    await mongoose.disconnect();
}

if (require.main === module) {
    init().catch(console.error);
}

module.exports = createServicesFromDatabases; 