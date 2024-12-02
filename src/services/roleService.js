import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL + '/api';

const getAuthHeaders = () => {
  const userStr = localStorage.getItem('user');
  const userData = JSON.parse(userStr);
  return {
    'Authorization': `Bearer ${userData.token}`,
    'Content-Type': 'application/json'
  };
};

export const createRole = async (roleData) => {
  try {
    const response = await axios.post(`${API_URL}/roles`, roleData, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to create role');
  }
};

export const getRoles = async () => {
  try {
    const response = await axios.get(`${API_URL}/roles`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw new Error('Failed to fetch roles');
  }
};

export const updateRole = async (roleId, roleData) => {
  try {
    const response = await axios.put(`${API_URL}/roles/${roleId}`, roleData, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update role');
  }
};

export const deleteRole = async (roleId) => {
  try {
    const response = await axios.delete(`${API_URL}/roles/${roleId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete role');
  }
};

export const getRoleById = async (roleId) => {
  try {
    const response = await axios.get(`${API_URL}/roles/${roleId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch role');
  }
};

export const getDatabaseObjects = async (serviceId) => {
  try {
    console.log('Fetching objects for service:', serviceId);
    const response = await axios.get(`${API_URL}/services/${serviceId}/objects`, {
      headers: getAuthHeaders()
    });
    
    console.log('Raw SQL objects:', response.data);
    
    // Transform the data into tables, views, procedures
    const objects = response.data || [];
    const grouped = {
      tables: objects
        .filter(o => o.type === 'U')
        .map(o => o.name),
      views: objects
        .filter(o => o.type === 'V')
        .map(o => o.name),
      procedures: objects
        .filter(o => ['P', 'FN', 'IF', 'TF'].includes(o.type))
        .map(o => o.name)
    };
    
    console.log('Grouped objects:', {
      totalObjects: objects.length,
      tables: grouped.tables.length,
      views: grouped.views.length,
      procedures: grouped.procedures.length,
      sample: {
        tables: grouped.tables.slice(0, 2),
        views: grouped.views.slice(0, 2),
        procedures: grouped.procedures.slice(0, 2)
      }
    });
    
    return grouped;
  } catch (error) {
    console.error('Error in getDatabaseObjects:', error);
    throw error;
  }
}; 