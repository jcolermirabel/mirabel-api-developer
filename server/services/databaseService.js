const { Connection, Request } = require('tedious');

const getConnectionConfig = (config) => {
  console.log('Attempting SQL connection with:', {
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username
  });

  return {
    server: config.host,
    port: parseInt(config.port),
    database: config.database,
    user: config.username,
    password: config.password,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectTimeout: 60000,
      requestTimeout: 60000,
      packetSize: 4096,
      debug: {
        packet: true,
        data: true,
        payload: true
      }
    }
  };
};

const testConnection = async (config) => {
  return new Promise((resolve, reject) => {
    console.log('\n=== Starting SQL Connection Test ===');
    console.log('Connection config:', {
      server: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    });

    const connection = new Connection(getConnectionConfig(config));

    connection.on('debug', console.log);
    connection.on('error', console.error);
    connection.on('errorMessage', console.error);
    connection.on('infoMessage', console.log);
    
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