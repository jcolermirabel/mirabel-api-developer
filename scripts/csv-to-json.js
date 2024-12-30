const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

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
    failoverHost: record.failover_host,
    port: parseInt(record.port),
    username: record.username,
    password: record.password,
    component: record.component,
    actions: record.actions.split(',').map(action => action.trim())
  }));

  // Create output object
  const output = {
    databases
  };

  // Write to JSON file
  const outputPath = path.join(
    path.dirname(csvFilePath),
    path.basename(csvFilePath, '.csv') + '_import.json'
  );
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log(`Processed ${databases.length} database entries`);
  console.log(`Output written to ${outputPath}`);

} catch (error) {
  console.error('Error processing CSV:', error.message);
  process.exit(1);
} 