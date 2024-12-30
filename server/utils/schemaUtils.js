const sql = require('mssql');
const { logger } = require('./logger');

exports.fetchSchemaFromDatabase = async (service, options = {}) => {
  try {
    const config = {
      user: service.username,
      password: service.password,
      server: service.host,
      port: service.port,
      database: service.database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        cryptoCredentialsDetails: {
          minVersion: 'TLSv1'
        },
        connectionTimeout: 30000,
        requestTimeout: 30000,
        enableArithAbort: true
      }
    };

    const pool = await sql.connect(config);

    // Simpler queries that just get names
    const tables = await pool.request().query(`
      SELECT SCHEMA_NAME(schema_id) as schema_name, name 
      FROM sys.tables 
      WHERE is_ms_shipped = 0 
      ORDER BY name
    `);

    const views = await pool.request().query(`
      SELECT SCHEMA_NAME(schema_id) as schema_name, name 
      FROM sys.views 
      WHERE is_ms_shipped = 0 
      ORDER BY name
    `);

    const procedures = await pool.request().query(`
      SELECT SCHEMA_NAME(schema_id) as schema_name, name 
      FROM sys.procedures 
      WHERE is_ms_shipped = 0 
      ORDER BY name
    `);

    await pool.close();

    // Process the results to create paths
    return {
      tables: tables.recordset.map(t => ({ 
        name: t.name,
        path: `/table/${t.schema_name}.${t.name}`
      })),
      views: views.recordset.map(v => ({ 
        name: v.name,
        path: `/view/${v.schema_name}.${v.name}`
      })),
      procedures: procedures.recordset.map(p => ({ 
        name: p.name,
        path: `/proc/${p.name}`
      }))
    };
  } catch (error) {
    logger.error('Error fetching database schema:', error);
    throw new Error('Failed to fetch database schema');
  } finally {
    try {
      await sql.close();
    } catch (err) {
      console.error('Error closing SQL connection:', err);
    }
  }
}; 