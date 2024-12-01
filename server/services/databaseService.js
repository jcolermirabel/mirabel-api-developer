const sql = require('mssql');

const getConnectionConfig = (config) => {
  // Use host and port directly
  const server = config.host;
  const port = parseInt(config.port);

  console.log('Building SQL config with:', {
    server,
    port,
    database: config.database,
    username: config.username,
    name: config.name
  });

  const connectionConfig = {
    server,
    port,
    database: config.database,
    user: config.username,
    password: config.password,
    options: {
      trustServerCertificate: true,
      encrypt: false,
      enableArithAbort: true,
      validateBulkLoadParameters: false,
      debug: {
        packet: true,
        data: true,
        payload: true,
        token: true
      },
      serverName: config.name
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    },
    requestTimeout: 30000,
    connectionTimeout: 30000
  };

  console.log('Final SQL Config:', {
    server: connectionConfig.server,
    port: connectionConfig.port,
    database: connectionConfig.database,
    user: connectionConfig.user,
    options: connectionConfig.options,
    pool: connectionConfig.pool,
    timeouts: {
      request: connectionConfig.requestTimeout,
      connection: connectionConfig.connectionTimeout
    }
  });

  return connectionConfig;
};

const testConnection = async (config) => {
  let pool;
  try {
    console.log('\n=== Starting SQL Connection Test ===');
    console.log('Input config:', {
      ...config,
      password: '[REDACTED]'
    });

    const connectionConfig = getConnectionConfig(config);
    
    console.log('\nCreating connection pool...');
    pool = new sql.ConnectionPool(connectionConfig);
    
    console.log('\nAttempting to connect...');
    await pool.connect();
    
    console.log('\nConnection successful, executing test query...');
    const result = await pool.request().query('SELECT 1 as test');
    console.log('Test query result:', result);
    
    return { success: true };
  } catch (error) {
    console.error('\n=== SQL Connection Test Failed ===');
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      state: error.state,
      serverName: error.serverName,
      className: error.className,
      lineNumber: error.lineNumber
    });
    console.error('Full error:', error);
    console.error('Stack trace:', error.stack);
    
    return { 
      success: false, 
      error: `Connection failed: ${error.message}`,
      details: {
        code: error.code,
        state: error.state,
        serverName: error.serverName
      }
    };
  } finally {
    if (pool) {
      try {
        console.log('\nClosing connection pool...');
        await pool.close();
        console.log('Connection pool closed successfully');
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