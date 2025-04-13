import axios from 'axios';
import { getToken } from './authService';

// Use empty string for relative path in production
const API_URL = process.env.REACT_APP_API_URL || '';

const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const getUsers = async () => {
  try {
    console.log('Fetching users from:', `${API_URL}/api/users`);
    const headers = getAuthHeaders();
    console.log('Auth headers:', headers);
    
    const response = await axios.get(`${API_URL}/api/users`, {
      headers,
      withCredentials: true
    });
    
    console.log('Users response:', response.data);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const createUser = async (userData) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/users`,
      userData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to create user');
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const response = await axios.put(
      `${API_URL}/api/users/${userId}`,
      userData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update user');
  }
};

export const deleteUser = async (userId) => {
  try {
    await axios.delete(
      `${API_URL}/api/users/${userId}`,
      { headers: getAuthHeaders() }
    );
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete user');
  }
};

export const generateApiKey = async (userId) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/users/${userId}/generate-api-key`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to generate API key');
  }
}; 