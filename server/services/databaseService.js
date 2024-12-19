const sql = require('mssql');
const { decryptDatabasePassword } = require('../utils/encryption');

class DatabaseService {
  static async createConnection(service) {
    const config = {
      user: service.username,
      password: decryptDatabasePassword(service.password),
      server: service.host,
      port: parseInt(service.port),
      database: service.database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 30000
      }
    };

    return await sql.connect(config);
  }

  static async executeStoredProcedure(service, procedureName, params = {}) {
    let pool;
    try {
      pool = await this.createConnection(service);
      const request = pool.request();

      // Add parameters to the request
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });

      const result = await request.execute(procedureName);
      return result.recordset;
    } finally {
      if (pool) {
        try {
          await pool.close();
        } catch (err) {
          console.error('Error closing SQL connection:', err);
        }
      }
    }
  }

  static async testConnection(service) {
    let pool;
    try {
      pool = await this.createConnection(service);
      await pool.request().query('SELECT 1');
      return {
        success: true,
        message: 'Connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          state: error.state
        }
      };
    } finally {
      if (pool) {
        try {
          await pool.close();
        } catch (err) {
          console.error('Error closing SQL connection:', err);
        }
      }
    }
  }

  static async getDatabaseObjects(service) {
    let pool;
    try {
      pool = await this.createConnection(service);
      
      const result = await pool.request().query(`
        SELECT 
          o.name,
          o.type_desc,
          o.type,
          s.name as schema_name,
          CASE 
            WHEN o.type IN ('U') THEN 'TABLE'
            WHEN o.type IN ('V') THEN 'VIEW'
            WHEN o.type IN ('P', 'PC') THEN 'PROCEDURE'
            ELSE o.type_desc
          END as object_category
        FROM sys.objects o
        JOIN sys.schemas s ON o.schema_id = s.schema_id
        WHERE o.type IN ('U', 'V', 'P', 'PC')
          AND o.is_ms_shipped = 0
          AND s.name = 'dbo'
        ORDER BY o.type_desc, o.name;
      `);

      return result.recordset;
    } finally {
      if (pool) {
        try {
          await pool.close();
        } catch (err) {
          console.error('Error closing SQL connection:', err);
        }
      }
    }
  }
}

module.exports = DatabaseService;