const sql = require('mssql');
const { decryptDatabasePassword } = require('./encryption');
const { logger } = require('../middleware/logger');

async function fetchSchemaFromDatabase(pool, objectName) {
  try {
    console.log('Fetching schema for:', objectName);
    console.log('Connection state:', {
      connected: pool.connected,
      config: {
        server: pool.config.server,
        port: pool.config.port,
        database: pool.config.database
      }
    });

    const result = await pool.request()
      .input('objectName', sql.VarChar, objectName)
      .query(`
        SELECT name, type_desc 
        FROM sys.objects 
        WHERE name = @objectName
      `);

    return result.recordset;
  } catch (error) {
    console.error('Schema fetch error:', error);
    throw error;
  }
}

module.exports = { fetchSchemaFromDatabase }; 