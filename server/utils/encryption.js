const crypto = require('crypto');

const IV_LENGTH = 16;

const decryptDatabasePassword = (encryptedPassword) => {
  try {
    const [encryptedHex, ivHex] = encryptedPassword.split(':');
    
    console.log('Backend decryption attempt:', {
      encryptionKey: process.env.ENCRYPTION_KEY?.length,
      keyBuffer: Buffer.from(process.env.ENCRYPTION_KEY, 'hex').length,
      ivLength: Buffer.from(ivHex, 'hex').length,
      encryptedLength: Buffer.from(encryptedHex, 'hex').length
    });

    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
      iv
    );
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error details:', error);
    throw new Error('Failed to decrypt password');
  }
};

const encryptDatabasePassword = (password) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
      iv
    );
    
    let encrypted = cipher.update(password);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return encrypted.toString('hex') + ':' + iv.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt password');
  }
};

module.exports = {
  encryptDatabasePassword,
  decryptDatabasePassword
}; 