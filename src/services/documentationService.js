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

export const getDocumentation = async (type, id) => {
  try {
    const response = await axios.get(`${API_URL}/api/documentation/${type}/${id}`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching documentation for ${type}/${id}:`, error);
    throw error;
  }
};

export const updateDocumentation = async (type, id, content) => {
  try {
    const response = await axios.put(
      `${API_URL}/api/documentation/${type}/${id}`,
      { content },
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update documentation');
  }
};

// Add any other documentation-related API calls here 