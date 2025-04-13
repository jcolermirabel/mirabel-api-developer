import api from './api';

export const getUsers = async () => {
  try {
    const response = await api.get('/api/users');
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const createUser = async (userData) => {
  try {
    const response = await api.post('/api/users', userData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to create user');
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const response = await api.put(`/api/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update user');
  }
};

export const deleteUser = async (userId) => {
  try {
    await api.delete(`/api/users/${userId}`);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete user');
  }
};

export const generateApiKey = async (userId) => {
  try {
    const response = await api.post(`/api/users/${userId}/generate-api-key`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to generate API key');
  }
}; 