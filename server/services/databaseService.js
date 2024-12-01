const sql = require('mssql');

const getConnectionConfig = (config) => {
  const port = parseInt(config.port);
  
  const connectionConfig = {
    user: config.username,
    password: config.password,
    database: config.database,
    server: config.host,
    connectionTimeout: 30000,
    requestTimeout: 30000,
    stream: false,
    options: {
      trustServerCertificate: true,
      encrypt: false,
      enableArithAbort: true,
      port: port,
      database: config.database
    }
  };

  return connectionConfig;
};

module.exports = {
  getConnectionConfig
}; 