const sql = require('mssql');

const getConnectionConfig = (config) => {
  const port = parseInt(config.port);

  console.log('Building SQL config with:', {
    server: config.host,
    port,
    database: config.database,
    username: config.username
  });

  return {
    server: config.host,
    port,
    database: config.database,
    user: config.username,
    password: config.password,
    options: {
      trustServerCertificate: true,
      encrypt: false,
      enableArithAbort: true,
      port,  // Specify port in options too
      connectTimeout: 30000,
      requestTimeout: 30000
    }
  };
};

const testConnection = async (config) => {
  let pool;
  try {
    console.log('\n=== Starting SQL Connection Test ===');
    const connectionConfig = getConnectionConfig(config);
    
    console.log('Connecting with config:', {
      ...connectionConfig,
      password: '[REDACTED]'
    });
    
    pool = await sql.connect(connectionConfig);
    const result = await pool.request().query('SELECT 1 as test');
    
    return { success: true };
  } catch (error) {
    console.error('Connection failed:', error);
    return { 
      success: false, 
      error: error.message 
    };
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};

module.exports = {
  getConnectionConfig,
  testConnection
}; 