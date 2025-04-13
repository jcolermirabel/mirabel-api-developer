const DatabaseObject = require('../models/DatabaseObject');
const sql = require('mssql');

const fetchDatabaseObjects = async (config) => {
  let pool;
  try {
    console.log('Fetching database objects with config:', {
      server: config.server,
      port: config.port,
      database: config.database,
      user: config.user
    });
    
    pool = await sql.connect(config);
    console.log('SQL connection established for schema fetch');

    // Get tables
    const tablesResult = await pool.request().query(`
      SELECT 
        t.name AS table_name,
        s.name AS schema_name,
        'TABLE' AS object_type
      FROM sys.tables t
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      WHERE t.is_ms_shipped = 0
      ORDER BY s.name, t.name
    `);
    console.log(`Found ${tablesResult.recordset.length} tables`);

    // Get views
    const viewsResult = await pool.request().query(`
      SELECT 
        v.name AS view_name,
        s.name AS schema_name,
        'VIEW' AS object_type
      FROM sys.views v
      INNER JOIN sys.schemas s ON v.schema_id = s.schema_id
      WHERE v.is_ms_shipped = 0
      ORDER BY s.name, v.name
    `);
    console.log(`Found ${viewsResult.recordset.length} views`);

    // Get procedures
    const proceduresResult = await pool.request().query(`
      SELECT 
        p.name AS procedure_name,
        s.name AS schema_name,
        'PROCEDURE' AS object_type
      FROM sys.procedures p
      INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
      WHERE p.is_ms_shipped = 0
      ORDER BY s.name, p.name
    `);
    console.log(`Found ${proceduresResult.recordset.length} procedures`);

    return {
      tables: tablesResult.recordset,
      views: viewsResult.recordset,
      procedures: proceduresResult.recordset
    };
  } catch (error) {
    console.error('Error fetching database objects:', {
      message: error.message,
      code: error.code,
      state: error.state,
      stack: error.stack,
      config: {
        server: config.server,
        port: config.port,
        database: config.database,
        user: config.user
      }
    });
    throw error;
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('SQL connection closed after schema fetch');
      } catch (err) {
        console.error('Error closing SQL connection after schema fetch:', err);
      }
    }
  }
};

const updateDatabaseObjects = async (serviceId, objects) => {
  try {
    console.log('Updating database objects for service:', serviceId);
    
    // Transform the database objects to include path for MongoDB storage
    const transformedProcedures = objects.procedures.map(proc => ({
      name: proc.procedure_name || proc.name || '',
      schema: proc.schema_name || proc.schema || 'dbo',
      type: 'PROCEDURE',
      path: `/${proc.schema_name || proc.schema || 'dbo'}.${proc.procedure_name || proc.name || ''}`
    }));
    
    const transformedViews = objects.views.map(view => ({
      name: view.view_name || view.name || '',
      schema: view.schema_name || view.schema || 'dbo',
      type: 'VIEW',
      path: `/${view.schema_name || view.schema || 'dbo'}.${view.view_name || view.name || ''}`
    }));
    
    const transformedTables = objects.tables.map(table => ({
      name: table.table_name || table.name || '',
      schema: table.schema_name || table.schema || 'dbo',
      type: 'TABLE',
      path: `/${table.schema_name || table.schema || 'dbo'}.${table.table_name || table.name || ''}`
    }));
    
    console.log('Transformed object counts:', {
      procedures: transformedProcedures.length,
      views: transformedViews.length,
      tables: transformedTables.length
    });
    
    // Sort each category alphabetically by path
    const sortedProcs = transformedProcedures.sort((a, b) => 
      a.path.localeCompare(b.path)
    );
    
    const sortedViews = transformedViews.sort((a, b) => 
      a.path.localeCompare(b.path)
    );
    
    const sortedTables = transformedTables.sort((a, b) => 
      a.path.localeCompare(b.path)
    );

    // Combine in the desired order: procs, views, tables
    const allObjects = [
      ...sortedProcs,
      ...sortedViews,
      ...sortedTables
    ];

    console.log('Saving all objects to MongoDB, total count:', allObjects.length);
    
    // Update or create the database objects document
    const result = await DatabaseObject.findOneAndUpdate(
      { serviceId },
      { 
        serviceId,
        objects: allObjects
      },
      { upsert: true, new: true }
    );
    
    console.log('Database objects saved successfully');

    return {
      totalObjects: allObjects.length,
      tables: sortedTables,
      views: sortedViews,
      procedures: sortedProcs
    };
  } catch (error) {
    console.error('Error updating database objects:', error);
    throw error;
  }
};

module.exports = {
  fetchDatabaseObjects,
  updateDatabaseObjects
}; 