const crypto = require('crypto');

const IV_LENGTH = 16;

const decryptDatabasePassword = (encryptedPassword) => {
  try {
    console.log('Decryption attempt for password of length:', encryptedPassword?.length);
    
    if (!encryptedPassword || typeof encryptedPassword !== 'string') {
      throw new Error('Invalid encrypted password format: ' + typeof encryptedPassword);
    }
    
    if (!encryptedPassword.includes(':')) {
      throw new Error('Invalid encrypted password format: no delimiter found');
    }
    
    const [encryptedHex, ivHex] = encryptedPassword.split(':');
    console.log('Split encrypted password - encrypted part length:', encryptedHex?.length, 'IV part length:', ivHex?.length);
    
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    console.log('ENCRYPTION_KEY available, length:', process.env.ENCRYPTION_KEY.length);
    
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    console.log('Buffers created successfully - IV length:', iv.length, 'Encrypted length:', encrypted.length);
    
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
      iv
    );
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    const result = decrypted.toString();
    console.log('Decryption successful, decrypted password length:', result.length);
    
    return result;
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
    console.log('Encryption attempt for password of length:', password?.length);
    
    if (!password || typeof password !== 'string') {
      throw new Error('Invalid password format: ' + typeof password);
    }
    
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    
    console.log('ENCRYPTION_KEY available, length:', process.env.ENCRYPTION_KEY.length);

    const iv = crypto.randomBytes(IV_LENGTH);
    console.log('IV generated, length:', iv.length);
    
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
      iv
    );
    
    let encrypted = cipher.update(password);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const result = encrypted.toString('hex') + ':' + iv.toString('hex');
    console.log('Encryption successful, result length:', result.length);
    
    return result;
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