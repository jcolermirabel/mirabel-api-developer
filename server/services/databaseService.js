const { Connection, Request } = require('tedious');

const getConnectionConfig = (config) => {
  const port = parseInt(config.port);

  const connectionConfig = {
    authentication: {
      type: 'default',
      options: {
        userName: config.username,
        password: config.password
      }
    },
    server: config.host,
    options: {
      port: port,
      database: config.database,
      trustServerCertificate: true,
      encrypt: false,
      connectTimeout: 30000,
      requestTimeout: 30000
    }
  };

  console.log('Building connection config:', {
    server: connectionConfig.server,
    port: connectionConfig.options.port,
    database: connectionConfig.options.database,
    user: connectionConfig.authentication.options.userName
  });

  return connectionConfig;
};

const testConnection = async (config) => {
  return new Promise((resolve, reject) => {
    const connection = new Connection(getConnectionConfig(config));

    connection.on('connect', (err) => {
      if (err) {
        console.error('Connection failed:', err);
        connection.close();
        resolve({ 
          success: false, 
          error: err.message 
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