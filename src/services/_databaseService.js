import axios from 'axios';
import { encryptDatabasePassword, decryptDatabasePassword } from '../utils/encryption';

const API_URL = process.env.REACT_APP_API_URL;

export const createDatabaseConnection = async (connectionData) => {
  try {
    const encryptedPassword = encryptDatabasePassword(connectionData.password);
    const response = await axios.post(`${API_URL}/services`, {
      ...connectionData,
      password: encryptedPassword
    }, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'x-mirabel-api-key': process.env.REACT_APP_API_KEY
      }
    });
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to create database connection');
  }
};

export const testConnection = async (connectionData) => {
  try {
    const encryptedPassword = encryptDatabasePassword(connectionData.password);
    const response = await axios.post(`${API_URL}/services/test`, {
      ...connectionData,
      password: encryptedPassword
    }, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'x-mirabel-api-key': process.env.REACT_APP_API_KEY
      }
    });
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Connection test failed');
  }
};

const getToken = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user?.token;
}; 