const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

const encryptDatabasePassword = (password) => {
  const keyBytes = CryptoJS.enc.Hex.parse(ENCRYPTION_KEY);
  
  const iv = CryptoJS.lib.WordArray.random(16);
  
  const encrypted = CryptoJS.AES.encrypt(password, keyBytes, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  const ivHex = iv.toString(CryptoJS.enc.Hex);
  const encryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  
  return encryptedHex + ':' + ivHex;
};

const decryptDatabasePassword = (encryptedPassword) => {
  const [encryptedHex, ivHex] = encryptedPassword.split(':');
  
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const encrypted = CryptoJS.enc.Hex.parse(encryptedHex);
  
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: encrypted,
    iv: iv
  });
  
  const decrypted = CryptoJS.AES.decrypt(cipherParams, ENCRYPTION_KEY, {
    iv: iv
  });
  
  return decrypted.toString(CryptoJS.enc.Utf8);
};

module.exports = {
  encryptDatabasePassword,
  decryptDatabasePassword
}; 