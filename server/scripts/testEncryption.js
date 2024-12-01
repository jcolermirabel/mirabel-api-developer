require('dotenv').config();
const crypto = require('crypto');

// The encryption function that should match how we encrypt passwords
const encryptPassword = (plaintext) => {
  // Generate a random IV
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

  console.log('Encryption step:', {
    plaintextLength: plaintext.length,
    keyLength: key.length,
    ivLength: iv.length
  });

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Return encrypted:iv format
  return `${encrypted}:${iv.toString('hex')}`;
};

// Test with a known password
const testPassword = 'testPassword123!';
console.log('\nOriginal password:', testPassword);

// Encrypt it
console.log('\nEncrypting...');
const encrypted = encryptPassword(testPassword);
console.log('Encrypted result:', encrypted);

// Now decrypt it
console.log('\nDecrypting...');
const [encryptedPart, iv] = encrypted.split(':');
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const decipher = crypto.createDecipheriv(
  'aes-256-cbc',
  key,
  Buffer.from(iv, 'hex')
);

let decrypted = decipher.update(encryptedPart, 'hex', 'utf8');
decrypted += decipher.final('utf8');

console.log('Decrypted result:', decrypted);
console.log('Matches original:', decrypted === testPassword);

// Now check the service password format
console.log('\nComparing to service password format:');
const servicePassword = '48682afc39616fb67361230161c9c92e4fab7a0d200556d1545f742c50418d571dcf75503e21f517561a453ec43c179c1ba5303d308c1252234a7ba82a4a5f46e7f72f25535224a160f38878b55bc1b61fa782e6b10baf71956d4ef72bec445d2c1d59ce6714eac574c07ebc8d5589af029e6100b451ede98e0b25a86543bb3080cc03c32733bae9de8e74735b77424971bb373a95ba0196f83266f08190e7cea083238bef70e0025575a75855d10686af0ba9b469ee59e034bc017a6b10e7e11f29e49f000cd90302d74a0accb242b53b59ad7835fb0052602458f6d04b681801ae705773fdda00a19ac93784df0ff8706da3b6188c8a3c2a6e16b21254a1e17a79cba1d15569e2b7fa9c502042bf649b0403de8a94ef5f5248907af8c562f9a20c791307ec8f06ff8e67789fdfc454e1351a52dc1b24f00d6912d65d94d4c331339d26e12180805097a35cb22165720547dccb190855b758bdffda1b207bc30b8b68aa84dabb8da7bc7addfdff13fadac3e742e900c5dbe59f5e23cf82045040206fcae62c08fba9287da30e8224556f22b809db687a6d4f249f26ccd46c4aa7412d5f6390920bac62ac6b95a0fcb74be980c11ea41fb0a655125ad23c40ee45530df090f04e03640048edad0323fac30ed529a2d9c0a00578634875114fafb8b5214d497a3327420ee0af2dc6cd439fea6b08e88ad642da39f86bdce56cd9550afa88addea5beaf3a30924debbacf014143d212ee97dfad0caaa89a0d9c2aaef117569d0c1f98aa731935be6d2f45b7e328e1a85cde6d9268e4045d4e2ca166ef1336299653634ed760c6949f99c9:24355e67d331c168127e4a078763a209';

console.log('Service password format:', {
  hasDoubleEncryption: servicePassword.split(':')[0].includes(':'),
  totalLength: servicePassword.length,
  parts: servicePassword.split(':').length
}); 