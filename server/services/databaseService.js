const sql = require('mssql');

const getConnectionConfig = (config) => {
  // Format server string based on environment
  let server = config.host;
  
  // If instance name is included, handle it appropriately
  if (server.includes('\\')) {
    // For named instances, keep the format as is
    server = config.host;
  } else {
    // For IP addresses, use host,port format
    server = `${config.host},${config.port}`;
  }

  return {
    server,
    database: config.database,
    user: config.username,
    password: config.password,
    options: {
      trustServerCertificate: true,
      encrypt: false, // Set to false to avoid TLS warning
      enableArithAbort: true,
      connectionTimeout: 30000,
      instanceName: config.instanceName,
      port: parseInt(config.port),
      validateBulkLoadParameters: false,
      cryptoCredentialsDetails: {
        minVersion: 'TLSv1'
      }
    }
  };
};

const testConnection = async (config) => {
  const connectionConfig = getConnectionConfig(config);
  console.log('Attempting connection with config:', {
    ...connectionConfig,
    password: '[REDACTED]'
  });
  
  try {
    // Create a new connection pool for each test
    const pool = new sql.ConnectionPool(connectionConfig);
    await pool.connect();
    await pool.request().query('SELECT 1'); // Test query
    await pool.close();
    return { success: true };
  } catch (error) {
    console.error('Connection test failed:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

module.exports = {
  getConnectionConfig,
  testConnection
}; 