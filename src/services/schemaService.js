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

export const getSchemaInfo = async (serviceId) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/services/${serviceId}/schema`,
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching schema for service ${serviceId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch schema information');
  }
};

export const getTableDetails = async (serviceId, tableName) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/services/${serviceId}/schema/${tableName}`,
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching table details for ${serviceId}/${tableName}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to fetch table details');
  }
}; 