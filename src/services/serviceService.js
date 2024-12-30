import api from './api';

export const createService = async (serviceData) => {
  const response = await api.post('/api/services', serviceData);
  return response.data;
};

export const updateService = async (id, serviceData) => {
  const response = await api.put(`/api/services/${id}`, serviceData);
  return response.data;
};

export const getServices = async () => {
  const response = await api.get('/api/services');
  return response.data;
};

export const getService = async (id) => {
  const response = await api.get(`/api/services/${id}`);
  return response.data;
};

export const deleteService = async (id) => {
  try {
    const response = await api.delete(`/api/services/${id}`);
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
  const response = await api.post('/api/services/test', {
    ...connectionData,
    failoverHost: connectionData.failoverHost
  });
  return response.data;
};

export const refreshServiceSchema = async (id) => {
  const response = await api.post(`/api/services/${id}/refresh-schema`);
  return response.data;
}; 