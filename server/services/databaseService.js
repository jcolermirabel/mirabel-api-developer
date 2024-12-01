const sql = require('mssql');

const getConnectionConfig = (config) => {
  const connectionString = `Server=${config.host},${config.port};Database=${config.database};User Id=${config.username};Password=${config.password};Encrypt=false;TrustServerCertificate=true;`;

  console.log('Connection string (password redacted):', 
    connectionString.replace(config.password, '[REDACTED]')
  );

  return {
    connectionString,
    options: {
      enableArithAbort: true,
      trustServerCertificate: true,
      encrypt: false,
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