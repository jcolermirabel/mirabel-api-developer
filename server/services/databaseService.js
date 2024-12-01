const { Connection, Request } = require('tedious');

const getConnectionConfig = (config) => {
  console.log('Building SQL config with:', {
    server: config.host,
    port: config.port,
    database: config.database,
    username: config.username
  });

  const connectionConfig = {
    server: config.host,
    authentication: {
      type: 'default',
      options: {
        userName: config.username,
        password: config.password
      }
    },
    options: {
      port: parseInt(config.port),
      database: config.database,
      trustServerCertificate: true,
      encrypt: false,
      enableArithAbort: true,
      useUTC: true,
      connectTimeout: 30000,
      requestTimeout: 30000,
      rowCollectionOnRequestCompletion: true
    }
  };

  console.log('Tedious config:', {
    server: connectionConfig.server,
    options: {
      ...connectionConfig.options,
      port: connectionConfig.options.port
    }
  });

  return connectionConfig;
};

const testConnection = async (config) => {
  return new Promise((resolve, reject) => {
    console.log('\n=== Starting SQL Connection Test ===');
    
    const connection = new Connection(getConnectionConfig(config));

    connection.on('connect', (err) => {
      if (err) {
        console.error('\n=== SQL Connection Test Failed ===');
        console.error('Error details:', err);
        connection.close();
        resolve({ 
          success: false, 
          error: `Connection failed: ${err.message}`,
          details: {
            code: err.code,
            state: err.state
          }
        });
        return;
      }

      console.log('\nConnection successful, executing test query...');
      const request = new Request('SELECT 1 as test', (err, rowCount) => {
        if (err) {
          console.error('Query failed:', err);
          connection.close();
          resolve({ 
            success: false, 
            error: `Query failed: ${err.message}`
          });
          return;
        }
        
        console.log('Query successful, rows:', rowCount);
        connection.close();
        resolve({ success: true });
      });

      connection.execSql(request);
    });

    connection.connect();
  });
};

module.exports = {
  getConnectionConfig,
  testConnection
}; 