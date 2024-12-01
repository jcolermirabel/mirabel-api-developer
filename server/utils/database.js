const { Connection, Request } = require('tedious');
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

  const pool = await new Connection(config);
  return pool;
};

const executeQuery = async (pool, query, params = []) => {
  try {
    const request = new Request(query, (err, rowCount, rows) => {
      if (err) {
        throw new Error(`Query execution failed: ${err.message}`);
      }
    });
    params.forEach((param, index) => {
      request.addParameter(`param${index}`, param);
    });
    await pool.exec(request);
    return rows;
  } catch (error) {
    throw new Error(`Query execution failed: ${error.message}`);
  }
};

module.exports = {
  createConnection,
  executeQuery,
  decryptPassword
}; 