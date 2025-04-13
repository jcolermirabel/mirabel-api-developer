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

export const getApplications = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/applications`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching applications:', error);
    throw error;
  }
};

export const getApplication = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/api/applications/${id}`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching application ${id}:`, error);
    throw error;
  }
};

export const createApplication = async (applicationData) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/applications`,
      applicationData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to create application');
  }
};

export const updateApplication = async (id, applicationData) => {
  try {
    const response = await axios.put(
      `${API_URL}/api/applications/${id}`,
      applicationData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update application');
  }
};

export const deleteApplication = async (id) => {
  try {
    await axios.delete(
      `${API_URL}/api/applications/${id}`,
      { headers: getAuthHeaders() }
    );
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete application');
  }
};

export const regenerateApiKey = async (id) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/applications/${id}/regenerate-key`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to regenerate API key');
  }
}; 