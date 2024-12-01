const sql = require('mssql');

const getConnectionConfig = (config) => {
  const connectionString = `mssql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;

  console.log('Connection string (redacted):', 
    connectionString.replace(config.password, '[REDACTED]')
  );

  return {
    connectionString,
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