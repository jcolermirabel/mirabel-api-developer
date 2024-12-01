const sql = require('mssql');

const getConnectionConfig = (config) => {
  let server = config.host;
  
  // Always use IP,port format for consistency
  server = `${config.host},${config.port}`;

  const connectionConfig = {
    server,
    database: config.database,
    user: config.username,
    password: config.password,
    options: {
      trustServerCertificate: true,
      encrypt: false,
      enableArithAbort: true,
      connectionTimeout: 30000,
      requestTimeout: 30000,
      port: parseInt(config.port),
      validateBulkLoadParameters: false
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };

  console.log('SQL Config:', {
    ...connectionConfig,
    password: '[REDACTED]'
  });

  return connectionConfig;
};

const testConnection = async (config) => {
  let pool;
  try {
    console.log('Starting SQL connection test...');
    const connectionConfig = getConnectionConfig(config);
    
    console.log('Creating connection pool...');
    pool = new sql.ConnectionPool(connectionConfig);
    
    console.log('Connecting to database...');
    await pool.connect();
    
    console.log('Executing test query...');
    const result = await pool.request().query('SELECT 1 as test');
    console.log('Test query result:', result);
    
    return { success: true };
  } catch (error) {
    console.error('SQL Connection test failed:', {
      message: error.message,
      code: error.code,
      state: error.state,
      serverName: error.serverName,
      className: error.className,
      lineNumber: error.lineNumber,
      stack: error.stack
    });
    
    return { 
      success: false, 
      error: `Connection failed: ${error.message}`,
      details: {
        code: error.code,
        state: error.state
      }
    };
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('Connection pool closed');
      } catch (closeError) {
        console.error('Error closing pool:', closeError);
      }
    }
  }
};

module.exports = {
  getConnectionConfig,
  testConnection
}; 