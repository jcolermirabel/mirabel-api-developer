import api from './api';

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
  const response = await api.get('/api/roles');
  return response.data;
};

export const getRoleById = async (id) => {
  const response = await api.get(`/api/roles/${id}`);
  return response.data;
};

export const createRole = async (roleData) => {
  try {
    console.log('Attempting to create role with data:', roleData);
    const response = await api.post('/api/roles', roleData);
    console.log('Role creation response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Role creation failed:', error.response?.data || error.message);
    throw error;
  }
};

export const updateRole = async (id, roleData) => {
  try {
    console.log('Attempting to update role:', { id, data: roleData });
    const response = await api.put(`/api/roles/${id}`, roleData);
    console.log('Role update response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Role update failed:', error.response?.data || error.message);
    throw error;
  }
};

export const deleteRole = async (id) => {
  await api.delete(`/api/roles/${id}`);
};

export const getServiceSchema = async (serviceId) => {
  try {
    logApiCall('GET', `/api/services/${serviceId}/schema`);
    const response = await api.get(`/api/services/${serviceId}/schema`);
    return response.data;
  } catch (error) {
    logApiCall('GET', `/api/services/${serviceId}/schema`, error);
    throw error;
  }
}; 