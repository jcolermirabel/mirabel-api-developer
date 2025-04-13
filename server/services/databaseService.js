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
      console.log('DatabaseService.testConnection called with:', {
        host: service.host,
        port: service.port,
        database: service.database,
        username: service.username,
        passwordProvided: !!service.password,
        passwordLength: service.password ? service.password.length : 0
      });

      // Handle both encrypted and unencrypted passwords
      let password = service.password;
      
      // If the password contains a colon, it's likely already encrypted
      if (typeof password === 'string' && password.includes(':')) {
        console.log('Password appears to be encrypted (contains colon), attempting to decrypt');
        try {
          password = decryptDatabasePassword(password);
          console.log('Password decryption successful');
        } catch (error) {
          console.error('Password decryption failed:', error);
          // If decryption fails, assume password is not encrypted
          console.log('Assuming password is not encrypted despite containing colon');
        }
      } else {
        console.log('Using password as-is (no colon detected)');
      }
      
      const config = {
        user: service.username,
        password: password,
        server: service.host,
        port: parseInt(service.port) || 1433,
        database: service.database,
        options: {
          encrypt: true,
          trustServerCertificate: true,
          connectTimeout: 30000
        }
      };

      console.log('Attempting SQL connection with config:', {
        user: config.user,
        server: config.server,
        port: config.port,
        database: config.database
      });

      pool = await sql.connect(config);
      console.log('SQL connection established successfully');
      
      console.log('Executing test query');
      await pool.request().query('SELECT 1');
      console.log('Test query executed successfully');
      
      return {
        success: true,
        message: 'Connection successful'
      };
    } catch (error) {
      console.error('Connection test failed:', {
        message: error.message,
        code: error.code,
        state: error.state,
        stack: error.stack
      });
      
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
          console.log('SQL connection closed');
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