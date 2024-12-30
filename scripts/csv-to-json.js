const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { encryptDatabasePassword } = require('../server/utils/encryption');

// Check if file path is provided
if (process.argv.length < 3) {
  console.error('Please provide a CSV file path');
  process.exit(1);
}

const csvFilePath = process.argv[2];

try {
  // Read and parse CSV file
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  // Transform records into the required format
  const databases = records.map(record => ({
    name: record.database_name,
    host: record.host,
    failoverHost: record.failover_host || '',
    port: parseInt(record.port),
    database: record.database_name,
    username: record.username,
    password: record.password, // Don't encrypt at this stage
    components: [{
      objectName: record.component,
      actions: {
        GET: true,
        POST: false,
        PUT: false,
        DELETE: false
      }
    }]
  }));

  // Group by database name to combine components
  const groupedDatabases = databases.reduce((acc, curr) => {
    const existing = acc.find(db => db.name === curr.name);
    if (existing) {
      // Check if component already exists
      const existingComponent = existing.components.find(comp => comp.objectName === curr.components[0].objectName);
      if (!existingComponent) {
        existing.components.push(...curr.components);
      }
    } else {
      acc.push(curr);
    }
    return acc;
  }, []);

  // Create output object
  const output = {
    databases: groupedDatabases
  };

  // Write to JSON file
  const outputPath = path.join(
    path.dirname(csvFilePath),
    path.basename(csvFilePath, '.csv') + '_import.json'
  );
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log(`Processed ${groupedDatabases.length} unique databases`);
  console.log(`Output written to ${outputPath}`);

} catch (error) {
  console.error('Error processing CSV:', error.message);
  process.exit(1);
} 