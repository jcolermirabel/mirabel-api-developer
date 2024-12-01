const sql = require('mssql');

const getConnectionConfig = (config) => {
  // Format server string based on environment
  let server = config.host;
  
  // If instance name is included, handle it appropriately
  if (server.includes('\\')) {
    server = config.host;
  } else {
    server = `${config.host},${config.port}`;
  }

  return {
    server,
    database: config.database,
    user: config.username,
    password: config.password,
    options: {
      trustServerCertificate: true,
      encrypt: false,  // Set to false for internal network
      enableArithAbort: true,
      connectionTimeout: 30000,
      requestTimeout: 30000,
      port: parseInt(config.port),
      validateBulkLoadParameters: false,
      debug: {
        packet: true,
        data: true,
        payload: true,
        token: false,
        connector: true
      }
    }
  };
};

const testConnection = async (config) => {
  const connectionConfig = getConnectionConfig(config);
  console.log('Attempting SQL connection with config:', {
    ...connectionConfig,
    password: '[REDACTED]',
    server: connectionConfig.server,
    database: connectionConfig.database,
    options: connectionConfig.options
  });
  
  try {
    const pool = new sql.ConnectionPool(connectionConfig);
    await pool.connect();
    
    // Test the connection with a simple query
    const result = await pool.request().query('SELECT 1 as test');
    console.log('Test query result:', result);
    
    await pool.close();
    return { success: true };
  } catch (error) {
    console.error('SQL Connection test failed:', {
      error: error.message,
      code: error.code,
      state: error.state,
      stack: error.stack
    });
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