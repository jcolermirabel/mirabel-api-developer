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
    const result = await pool.request().query('SELECT 1 as test');
    
    return { success: true };
  } catch (error) {
    console.error('Connection failed:', {
      message: error.message,
      code: error.code,
      state: error.state,
      user: config.username
    });
    return { success: false, error: error.message };
  } finally {
    if (pool) {
      await pool.close();
    }
  }
};

module.exports = {
  testConnection
}; 