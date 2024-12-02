require('dotenv').config();
const sql = require('mssql');

async function testConnection() {
  try {
    const config = {
      user: 'web',
      password: 'Mir@b202L-sqlw@b',  // The decrypted password
      server: '172.31.6.228',
      port: 56321,
      database: 'salesdemo_new',
      options: {
        trustServerCertificate: true,
        encrypt: false
      }
    };

    console.log('Testing SQL connection...');
    const pool = await sql.connect(config);
    const result = await pool.request().query('SELECT 1 as test');
    console.log('Connection successful:', result);
    await pool.close();
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

testConnection(); 