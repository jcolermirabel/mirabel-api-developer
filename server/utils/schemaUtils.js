const { Connection, Request } = require('tedious');
const sql = require('mssql');
const { decryptDatabasePassword } = require('./encryption');
const { logger } = require('../middleware/logger');

async function fetchSchemaFromDatabase(pool, objectName) {
  console.log('Fetching schema for:', {
    objectName,
    poolConfig: pool.config,
    poolState: pool.connected ? 'connected' : 'disconnected'
  });
  try {
    // Get procedure metadata
    const procedureInfo = await pool.request()
      .input('objectName', sql.VarChar, objectName)
      .query(`
        SELECT 
          p.name AS procedure_name,
          SCHEMA_NAME(p.schema_id) AS schema_name,
          m.definition AS procedure_definition,
          p.create_date,
          p.modify_date
        FROM sys.procedures p
        INNER JOIN sys.sql_modules m ON p.object_id = m.object_id
        WHERE p.name = @objectName
      `);

    console.log('Procedure info result:', procedureInfo);

    // Get parameter details
    const paramResult = await pool.request()
      .input('objectName', sql.VarChar, objectName)
      .query(`
        SELECT 
          p.name AS parameter_name,
          t.name AS parameter_type,
          p.max_length,
          p.precision,
          p.scale,
          p.is_output,
          p.is_nullable,
          p.parameter_id
        FROM sys.parameters p
        INNER JOIN sys.types t ON p.user_type_id = t.user_type_id
        WHERE p.object_id = OBJECT_ID(@objectName)
        ORDER BY p.parameter_id
      `);

    return {
      procedure: {
        name: procedureInfo.recordset[0]?.procedure_name,
        schema: procedureInfo.recordset[0]?.schema_name,
        definition: procedureInfo.recordset[0]?.procedure_definition,
        created: procedureInfo.recordset[0]?.create_date,
        modified: procedureInfo.recordset[0]?.modify_date
      },
      parameters: paramResult.recordset.map(param => ({
        name: param.parameter_name,
        type: param.parameter_type,
        maxLength: param.max_length,
        precision: param.precision,
        scale: param.scale,
        isOutput: param.is_output,
        isNullable: param.is_nullable,
        parameterId: param.parameter_id
      }))
    };
  } catch (error) {
    logger.error('Schema fetch error', { error: error.message, objectName });
    throw error;
  }
}

module.exports = { fetchSchemaFromDatabase }; 