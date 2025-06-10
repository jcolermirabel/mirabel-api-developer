const crypto = require('crypto');

const IV_LENGTH = 16;

const decryptDatabasePassword = (encryptedPassword) => {
  try {
    if (!encryptedPassword || typeof encryptedPassword !== 'string' || !encryptedPassword.includes(':')) {
      throw new Error('Invalid encrypted password format');
    }
    
    const [encryptedHex, ivHex] = encryptedPassword.split(':');
    
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      process.env.ENCRYPTION_KEY,
      iv
    );
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error details:', {
      message: error.message,
      stack: error.stack,
      encryptedPasswordLength: encryptedPassword?.length,
      encryptedPasswordType: typeof encryptedPassword,
      hasDelimiter: encryptedPassword?.includes?.(':'),
      encryptionKeyExists: !!process.env.ENCRYPTION_KEY
    });
    throw new Error('Failed to decrypt password: ' + error.message);
  }
};

const encryptDatabasePassword = (password) => {
  try {
    if (!password || typeof password !== 'string') {
      throw new Error('Invalid password format: ' + typeof password);
    }
    
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    // Temporary debugging
    console.log(`[DEBUG] ENCRYPTION_KEY Length: ${process.env.ENCRYPTION_KEY.length}`);
    console.log(`[DEBUG] ENCRYPTION_KEY Value: "${process.env.ENCRYPTION_KEY}"`);

    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      process.env.ENCRYPTION_KEY,
      iv
    );
    
    let encrypted = cipher.update(password);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return encrypted.toString('hex') + ':' + iv.toString('hex');
  } catch (error) {
    console.error('Encryption error details:', {
      message: error.message,
      stack: error.stack,
      passwordLength: password?.length,
      passwordType: typeof password,
      encryptionKeyExists: !!process.env.ENCRYPTION_KEY
    });
    throw new Error('Failed to encrypt password: ' + error.message);
  }
};

const generateApiKey = async () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(32, (err, buffer) => {
      if (err) reject(err);
      resolve(buffer.toString('hex'));
    });
  });
};

module.exports = {
  encryptDatabasePassword,
  decryptDatabasePassword,
  generateApiKey
}; 