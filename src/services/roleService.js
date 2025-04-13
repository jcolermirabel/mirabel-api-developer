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

// Add logging to track API calls
const logApiCall = (method, url, error = null) => {
  if (error) {
    console.error(`API ${method} ${url} failed:`, error);
    console.error('Auth token:', localStorage.getItem('user') ? 'Present' : 'Missing');
  } else {
    console.log(`API ${method} ${url} called`);
  }
};

export const getRoles = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/roles`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }
};

export const getRole = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/api/roles/${id}`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching role ${id}:`, error);
    throw error;
  }
};

// Add this alias for backward compatibility
export const getRoleById = getRole;

export const createRole = async (roleData) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/roles`,
      roleData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to create role');
  }
};

export const updateRole = async (id, roleData) => {
  try {
    const response = await axios.put(
      `${API_URL}/api/roles/${id}`,
      roleData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update role');
  }
};

export const deleteRole = async (id) => {
  try {
    await axios.delete(
      `${API_URL}/api/roles/${id}`,
      { headers: getAuthHeaders() }
    );
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete role');
  }
};

export const getServiceSchema = async (serviceId) => {
  try {
    const response = await axios.get(`${API_URL}/api/roles/service/${serviceId}/schema`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    logApiCall('GET', `${API_URL}/api/roles/service/${serviceId}/schema`);
    return response.data;
  } catch (error) {
    logApiCall('GET', `${API_URL}/api/roles/service/${serviceId}/schema`, error);
    throw error;
  }
}; 