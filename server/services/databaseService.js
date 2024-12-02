const sql = require('mssql');

const testConnection = async (config) => {
  let pool;
  try {
    const connectionConfig = {
      user: config.username,
      password: config.password,
      server: config.host,
      port: parseInt(config.port),
      database: config.database,
      options: {
        trustServerCertificate: true,
        encrypt: false
      }
    };

    console.log('Connection attempt with:', {
      user: connectionConfig.user,
      server: connectionConfig.server,
      port: connectionConfig.port,
      database: connectionConfig.database
    });

    pool = await sql.connect(connectionConfig);
    console.log('SQL connection established, testing query...');
    
    const result = await pool.request().query('SELECT 1 as test');
    console.log('Query result:', result.recordset);
    
    return { 
      success: true,
      message: 'Connection and query successful'
    };
  } catch (error) {
    console.error('Connection failed:', {
      message: error.message,
      code: error.code,
      state: error.state,
      user: config.username,
      stack: error.stack
    });
    return { 
      success: false, 
      error: error.message,
      details: error
    };
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('Connection closed');
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
};

module.exports = {
  testConnection
}; 