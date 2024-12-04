import CryptoJS from 'crypto-js';

export const encryptData = (data, key) => {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(data), 
    CryptoJS.enc.Hex.parse(key),
    {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  );
  
  return encrypted.ciphertext.toString(CryptoJS.enc.Hex) + ':' + iv.toString(CryptoJS.enc.Hex);
};

export const decryptData = (encryptedData, key) => {
  try {
    const [encryptedHex, ivHex] = encryptedData.split(':');
    
    const encrypted = CryptoJS.enc.Hex.parse(encryptedHex);
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encrypted },
      CryptoJS.enc.Hex.parse(key),
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}; 