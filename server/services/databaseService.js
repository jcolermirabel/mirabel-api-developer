const { Connection, Request } = require('tedious');

const getConnectionConfig = (config) => {
  const port = parseInt(config.port);

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
      port: port,
      database: config.database,
      trustServerCertificate: true,
      encrypt: false,
      connectTimeout: 30000,
      requestTimeout: 30000,
      rowCollectionOnRequestCompletion: true,
      useColumnNames: true,
      debug: {
        packet: true,
        data: true,
        payload: true,
        token: true
      }
    }
  };

  console.log('Building connection config:', {
    server: connectionConfig.server,
    port: connectionConfig.options.port,
    database: connectionConfig.options.database
  });

  return connectionConfig;
};

const testConnection = async (config) => {
  return new Promise((resolve, reject) => {
    console.log('\n=== Starting SQL Connection Test ===');
    const connection = new Connection(getConnectionConfig(config));

    connection.on('debug', console.log);
    
    connection.on('connect', (err) => {
      if (err) {
        console.error('Connection failed:', err);
        connection.close();
        resolve({ 
          success: false, 
          error: err.message,
          details: err
        });
        return;
      }

      console.log('Connected successfully');
      connection.close();
      resolve({ success: true });
    });

    connection.connect();
  });
};

module.exports = {
  getConnectionConfig,
  testConnection
}; 