const fs = require('fs');
const csv = require('csv-parse');
const path = require('path');
const { encryptDatabasePassword } = require('../server/utils/encryption');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

if (!process.env.ENCRYPTION_KEY) {
  console.error('Error: ENCRYPTION_KEY environment variable is not set');
  process.exit(1);
}

if (process.argv.length < 3) {
  console.error('Usage: node csv-to-json.js <path-to-csv-file>');
  process.exit(1);
}

const csvFilePath = process.argv[2];

const parser = csv.parse({
  columns: true,
  skip_empty_lines: true,
  trim: true
});

const databases = [];

fs.createReadStream(csvFilePath)
  .pipe(parser)
  .on('data', async (row) => {
    try {
      const encryptedPassword = encryptDatabasePassword(row.password);
      databases.push({
        name: row.database_name,
        host: row.host,
        failoverHost: row.failover_host || null,
        port: parseInt(row.port, 10),
        username: row.username,
        password: encryptedPassword,
        components: row.components.split(',').map(comp => comp.trim())
      });
    } catch (error) {
      console.error(`Error processing row for database ${row.database_name}:`, error.message);
      process.exit(1);
    }
  })
  .on('end', () => {
    const output = { databases };
    const outputPath = path.join(
      path.dirname(csvFilePath),
      `${path.basename(csvFilePath, '.csv')}_import.json`
    );
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`Conversion complete! Output saved to: ${outputPath}`);
    console.log(`Found ${databases.length} databases with a total of ${
      databases.reduce((sum, db) => sum + db.components.length, 0)
    } components.`);
  })
  .on('error', (error) => {
    console.error('Error processing CSV:', error.message);
    process.exit(1);
  }); 