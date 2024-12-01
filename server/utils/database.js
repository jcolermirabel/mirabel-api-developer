const sql = require('mssql');
const crypto = require('crypto');

const decryptPassword = (encryptedPassword, iv) => {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
    Buffer.from(iv, 'hex')
  );
  
  let decrypted = decipher.update(Buffer.from(encryptedPassword, 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString();
};

const createConnection = async (service) => {
  const decryptedPassword = decryptPassword(service.password, service.iv);
  
  const config = {
    user: service.username,
    password: decryptedPassword,
    server: service.host,
    port: service.port,
    database: service.database,
    options: {
      encrypt: true,
      trustServerCertificate: true
    }
  };

  const pool = await sql.connect(config);
  return pool;
};

const executeQuery = async (pool, query, params = []) => {
  try {
    const request = pool.request();
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    throw new Error(`Query execution failed: ${error.message}`);
  }
};

module.exports = {
  createConnection,
  executeQuery,
  decryptPassword
}; 