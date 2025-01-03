const DatabaseObject = require('../models/DatabaseObject');
const sql = require('mssql');

const fetchDatabaseObjects = async (config) => {
  try {
    // Enhance the config with additional SSL/TLS options
    const enhancedConfig = {
      ...config,
      options: {
        ...config.options,
        encrypt: true,
        trustServerCertificate: true,
        cryptoCredentialsDetails: {
          minVersion: 'TLSv1.2',
          maxVersion: 'TLSv1.2'
        },
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000
      }
    };

    const pool = await sql.connect(enhancedConfig);
    
    // Fetch tables
    const tables = await pool.request()
      .query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
      `);
    
    // Fetch views
    const views = await pool.request()
      .query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.VIEWS
      `);
    
    // Fetch procedures
    const procedures = await pool.request()
      .query(`
        SELECT ROUTINE_NAME 
        FROM INFORMATION_SCHEMA.ROUTINES 
        WHERE ROUTINE_TYPE = 'PROCEDURE'
      `);

    await pool.close();

    return {
      tables: tables.recordset.map(t => ({ path: `/table/${t.TABLE_NAME}` })),
      views: views.recordset.map(v => ({ path: `/view/${v.TABLE_NAME}` })),
      procedures: procedures.recordset.map(p => ({ path: `/proc/${p.ROUTINE_NAME}` }))
    };
  } catch (error) {
    console.error('Error fetching database objects:', error);
    throw error;
  } finally {
    try {
      await sql.close();
    } catch (err) {
      console.error('Error closing SQL connection:', err);
    }
  }
};

const updateDatabaseObjects = async (serviceId, objects) => {
  try {
    // Sort each category alphabetically
    const sortedProcs = objects.procedures.sort((a, b) => 
      a.path.toLowerCase().localeCompare(b.path.toLowerCase())
    );
    
    const sortedViews = objects.views.sort((a, b) => 
      a.path.toLowerCase().localeCompare(b.path.toLowerCase())
    );
    
    const sortedTables = objects.tables.sort((a, b) => 
      a.path.toLowerCase().localeCompare(b.path.toLowerCase())
    );

    // Combine in the desired order: procs, views, tables
    const allObjects = [
      ...sortedProcs,
      ...sortedViews,
      ...sortedTables
    ];

    // Update or create the database objects document
    await DatabaseObject.findOneAndUpdate(
      { serviceId },
      { 
        serviceId,
        objects: allObjects
      },
      { upsert: true, new: true }
    );

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