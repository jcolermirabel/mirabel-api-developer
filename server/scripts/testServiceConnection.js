const mongoose = require('mongoose');
const sql = require('mssql');
const Service = require('../models/Service');
const Connection = require('../models/Connection');
const { decryptDatabasePassword } = require('../utils/encryption');
require('dotenv').config({ path: __dirname + '/../.env' });

async function testServiceConnection(serviceName) {
  let pool;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the service
    const service = await Service.findOne({ name: serviceName, isActive: true });
    if (!service) {
      throw new Error(`Service '${serviceName}' not found or inactive`);
    }

    console.log(`✅ Service found: ${service.name}`);
    console.log(`   Database: ${service.database}`);
    console.log(`   Connection ID: ${service.connectionId}`);

    let connectionDetails = {};

    if (service.connectionId) {
      const connection = await Connection.findById(service.connectionId).select('+password');
      if (!connection) {
        throw new Error('The underlying connection for this service could not be found.');
      }
      connectionDetails = {
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password: connection.password,
      };
      console.log(`✅ Connection found: ${connection.name}`);
      console.log(`   Host: ${connection.host}:${connection.port}`);
      console.log(`   Username: ${connection.username}`);
    } else {
      // Fallback for older services without a dedicated connection object
      connectionDetails = {
        host: service.host,
        port: service.port,
        username: service.username,
        password: service.password,
      };
      console.log(`⚠️  Using legacy service connection details`);
      console.log(`   Host: ${service.host}:${service.port}`);
      console.log(`   Username: ${service.username}`);
    }

    if (!connectionDetails.password) {
      throw new Error('Could not determine credentials for service.');
    }

    console.log('\n🔐 Testing database connection...');
    
    const decryptedPassword = decryptDatabasePassword(connectionDetails.password);
    console.log(`   Decrypted password length: ${decryptedPassword.length} characters`);

    const config = {
      user: connectionDetails.username,
      password: decryptedPassword,
      server: connectionDetails.host,
      port: parseInt(connectionDetails.port),
      database: service.database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        cryptoCredentialsDetails: {
          minVersion: 'TLSv1'
        },
        connectionTimeout: 30000,
        requestTimeout: 30000
      }
    };

    console.log('   Connection config:', {
      user: config.user,
      server: config.server,
      port: config.port,
      database: config.database,
      passwordSet: !!config.password
    });

    // Test connection
    pool = await sql.connect(config);
    console.log('✅ Database connection successful!');

    // Test a simple query
    const result = await pool.request().query('SELECT @@VERSION as Version, DB_NAME() as CurrentDatabase');
    console.log('✅ Test query successful:');
    console.log(`   SQL Server Version: ${result.recordset[0].Version.substring(0, 50)}...`);
    console.log(`   Current Database: ${result.recordset[0].CurrentDatabase}`);

    return true;

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    return false;
  } finally {
    if (pool) {
      try {
        await sql.close();
        console.log('🔌 Database connection closed');
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
    await mongoose.disconnect();
    console.log('🔌 MongoDB connection closed');
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node testServiceConnection.js <serviceName>');
    console.error('Example: node testServiceConnection.js "salesdemo_new"');
    process.exit(1);
  }

  const [serviceName] = args;
  
  testServiceConnection(serviceName)
    .then((success) => {
      console.log(`\n🎯 Result: ${success ? 'CONNECTION SUCCESSFUL' : 'CONNECTION FAILED'}`);
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testServiceConnection }; 