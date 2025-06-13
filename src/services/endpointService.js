import axios from 'axios';
import { getToken } from './authService';

const API_URL = process.env.REACT_APP_API_URL || '';

const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const createEndpoint = async (endpointData) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/endpoints`, 
      endpointData, 
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating endpoint:', error);
    throw new Error(error.response?.data?.message || 'Failed to create endpoint');
  }
};

export const updateEndpoint = async (id, endpointData) => {
  try {
    const response = await axios.put(
      `${API_URL}/api/endpoints/${id}`, 
      endpointData, 
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating endpoint ${id}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to update endpoint');
  }
};

export const getEndpoints = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/api/endpoints`, 
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    throw error;
  }
};

export const deleteEndpoint = async (id) => {
  try {
    await axios.delete(
      `${API_URL}/api/endpoints/${id}`, 
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    return { 
      success: true,
      deletedId: id
    };
  } catch (error) {
    console.error('Delete operation failed:', {
      id,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    throw error;
  }
}; 