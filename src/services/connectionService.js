import api from './api';

export const getConnections = async () => {
  try {
    const response = await api.get('/api/connections');
    return response.data;
  } catch (error) {
    console.error('Error fetching connections:', error);
    throw error.response?.data?.message || 'Error fetching connections';
  }
};

export const getConnection = async (id) => {
  try {
    const response = await api.get(`/api/connections/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching connection ${id}:`, error);
    throw error.response?.data?.message || `Error fetching connection ${id}`;
  }
};

export const createConnection = async (connectionData) => {
  try {
    const response = await api.post('/api/connections', connectionData);
    return response.data;
  } catch (error) {
    console.error('Error creating connection:', error);
    throw error.response?.data?.message || 'Error creating connection';
  }
};

export const updateConnection = async (id, connectionData) => {
  try {
    const response = await api.put(`/api/connections/${id}`, connectionData);
    return response.data;
  } catch (error) {
    console.error(`Error updating connection ${id}:`, error);
    throw error.response?.data?.message || `Error updating connection ${id}`;
  }
};

export const deleteConnection = async (id) => {
  try {
    const response = await api.delete(`/api/connections/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting connection ${id}:`, error);
    throw error.response?.data?.message || `Error deleting connection ${id}`;
  }
};

export const testConnection = async (id) => {
  try {
    const response = await api.post(`/api/connections/${id}/test`);
    return response.data;
  } catch (error) {
    console.error(`Error testing connection ${id}:`, error);
    throw error.response?.data?.message || `Error testing connection ${id}`;
  }
};

export const testConnectionDetails = async (connectionData) => {
  try {
    const response = await api.post('/api/connections/test', connectionData);
    return response.data;
  } catch (error) {
    console.error('Error testing connection details:', error);
    const errorMessage = error.response?.data?.error || 'Connection test failed';
    throw new Error(errorMessage);
  }
}; 