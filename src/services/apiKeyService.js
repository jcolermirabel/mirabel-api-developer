import axios from 'axios';
import { getToken } from './authService';

const API_URL = process.env.REACT_APP_API_URL || '';

const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const getApiKeysForEndpoint = async (endpointId) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/api-keys/endpoint/${endpointId}`,
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching API keys for endpoint ${endpointId}:`, error);
    throw error;
  }
};

export const generateApiKey = async (endpointId) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/api-keys/endpoint/${endpointId}`,
      {},
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error generating API key:', error);
    throw new Error(error.response?.data?.message || 'Failed to generate API key');
  }
};

export const revokeApiKey = async (apiKeyId) => {
  try {
    await axios.delete(
      `${API_URL}/api/api-keys/${apiKeyId}`,
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    return { success: true, revokedId: apiKeyId };
  } catch (error) {
    console.error(`Error revoking API key ${apiKeyId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to revoke API key');
  }
}; 