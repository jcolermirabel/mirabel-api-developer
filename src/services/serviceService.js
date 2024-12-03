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

export const deleteService = async (id) => {
  await api.delete(`/api/services/${id}`);
};

export const testConnection = async (connectionData) => {
  const response = await api.post('/api/services/test', connectionData);
  return response.data;
};

export const refreshServiceSchema = async (id) => {
  const response = await api.post(`/api/services/${id}/refresh-schema`);
  return response.data;
}; 