import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export const createDatabaseConnection = async (connectionData) => {
  try {
    const response = await axios.post(`${API_URL}/services`, connectionData, {
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
    const response = await axios.post(`${API_URL}/services/test`, connectionData, {
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