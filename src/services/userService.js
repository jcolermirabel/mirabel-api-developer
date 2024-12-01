import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL + '/api';

const getAuthHeaders = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  console.log('Current user:', user);
  
  return {
    'Authorization': `Bearer ${user?.token}`,
    'X-Mirabel-API': process.env.REACT_APP_API_KEY
  };
};

export const getUsers = async () => {
  try {
    console.log('Fetching users...');
    const response = await axios.get(
      `${API_URL}/users`,
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    console.log('Users response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    console.error('Auth headers:', getAuthHeaders());
    throw error;
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