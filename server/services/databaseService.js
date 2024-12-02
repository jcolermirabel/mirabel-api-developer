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
  try {
    const connectionConfig = {
      user: config.username,
      password: config.password,
      server: config.host,
      port: parseInt(config.port),
      database: config.database,
      options: {
        trustServerCertificate: true,
        encrypt: false,
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000
      }
    };

    console.log('Testing connection with:', {
      ...connectionConfig,
      password: '[REDACTED]'
    });

    const pool = await sql.connect(connectionConfig);
    const result = await pool.request().query('SELECT 1 as test');
    await pool.close();
    return { success: true };
  } catch (error) {
    console.error('Connection failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  getConnectionConfig,
  testConnection
}; 