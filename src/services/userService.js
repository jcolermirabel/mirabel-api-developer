import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL + '/api';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).token}`,
  'X-Mirabel-API': process.env.REACT_APP_API_KEY
});

export const getUsers = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/users`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch users');
  }
};

export const createUser = async (userData) => {
  try {
    const response = await axios.post(
      `${API_URL}/users`,
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
      `${API_URL}/users/${userId}`,
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
      `${API_URL}/users/${userId}`,
      { headers: getAuthHeaders() }
    );
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete user');
  }
};

export const generateApiKey = async (userId) => {
  try {
    const response = await axios.post(
      `${API_URL}/users/${userId}/generate-api-key`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to generate API key');
  }
}; 