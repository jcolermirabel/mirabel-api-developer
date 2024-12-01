const sql = require('mssql');
const { fetchSchemaFromDatabase } = require('../utils/schemaUtils');
const Service = require('../models/Service');
const { decryptDatabasePassword } = require('../utils/encryption');

async function testSchemaFetch() {
  try {
    // Get a service from MongoDB
    const service = await Service.findOne({ name: 'salesdemo_staging' });
    if (!service) {
      console.error('Service not found');
      return;
    }

    // Connect to SQL Server
    const config = {
      user: service.username,
      password: decryptDatabasePassword(service.password),
      server: service.host,
      port: parseInt(service.port),
      database: service.database,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    };

    console.log('Connecting with config:', {
      ...config,
      password: '[REDACTED]'
    });

    const pool = await sql.connect(config);
    const schema = await fetchSchemaFromDatabase(pool, 'GetCustomers');  // Example procedure
    console.log('Schema result:', schema);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSchemaFetch(); 