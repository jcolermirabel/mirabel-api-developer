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

  // Try different server name formats
  const serverFormats = [
    server,                    // Just IP
    `${server},${port}`,      // IP,port
    `${server}:${port}`,      // IP:port
    `tcp:${server},${port}`,  // tcp:IP,port
    `tcp:${server}:${port}`   // tcp:IP:port
  ];

  console.log('Testing server formats:', serverFormats);

  const connectionConfig = {
    server: serverFormats[1], // Try IP,port format first
    database: config.database,
    user: config.username,
    password: config.password,
    options: {
      trustServerCertificate: true,
      encrypt: false,
      enableArithAbort: true,
      validateBulkLoadParameters: false,
      connectTimeout: 30000,
      requestTimeout: 30000,
      packetSize: 32768,
      debug: {
        packet: true,
        data: true,
        payload: true,
        token: true
      },
      serverName: config.name,
      rowCollectionOnRequestCompletion: true
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 1000
    }
  };

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