const sql = require('mssql');

const getConnectionConfig = (config) => {
  const port = parseInt(config.port);
  const server = `${config.host},${port}`;  // Use comma format for server

  console.log('Building connection config:', {
    server,
    database: config.database,
    user: config.username
  });

  return {
    server,  // host,port format
    database: config.database,
    user: config.username,
    password: config.password,
    options: {
      trustServerCertificate: true,
      encrypt: false,
      enableArithAbort: true,
      connectTimeout: 30000,
      requestTimeout: 30000,
      tdsVersion: '7_4'
    }
  };
};

const testConnection = async (config) => {
  let pool;
  try {
    console.log('\n=== Starting SQL Connection Test ===');
    const connectionConfig = getConnectionConfig(config);
    
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