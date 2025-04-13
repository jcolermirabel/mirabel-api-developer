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

export const createService = async (serviceData) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/services`, 
      serviceData, 
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating service:', error);
    throw new Error(error.response?.data?.message || 'Failed to create service');
  }
};

export const updateService = async (id, serviceData) => {
  try {
    const response = await axios.put(
      `${API_URL}/api/services/${id}`, 
      serviceData, 
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating service ${id}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to update service');
  }
};

export const getServices = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/api/services`, 
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
};

export const getService = async (id) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/services/${id}`, 
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching service ${id}:`, error);
    throw error;
  }
};

export const deleteService = async (id) => {
  try {
    const response = await axios.delete(
      `${API_URL}/api/services/${id}`, 
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    return { 
      ...response.data, 
      success: true,
      deletedId: id
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return { 
        success: true, 
        message: 'Service already removed',
        deletedId: id
      };
    }
    console.error('Delete operation failed:', {
      id,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    throw error;
  }
};

export const testConnection = async (connectionData) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/services/test`, 
      {
        ...connectionData,
        failoverHost: connectionData.failoverHost
      }, 
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error testing connection:', error);
    throw new Error(error.response?.data?.message || 'Failed to test connection');
  }
};

export const refreshServiceSchema = async (id) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/services/${id}/refresh-schema`, 
      {}, 
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    return {
      service: response.data.serviceName,
      objectCount: {
        total: response.data.totalObjects,
        tables: response.data.tables.length,
        views: response.data.views.length,
        procedures: response.data.procedures.length
      }
    };
  } catch (error) {
    console.error(`Error refreshing schema for service ${id}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to refresh service schema');
  }
}; 