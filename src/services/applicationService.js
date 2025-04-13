import api from './api';

export const getApplications = async () => {
  try {
    const response = await api.get('/api/applications');
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching applications:', error);
    throw error;
  }
};

export const getApplication = async (id) => {
  try {
    const response = await api.get(`/api/applications/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching application ${id}:`, error);
    throw error;
  }
};

export const createApplication = async (applicationData) => {
  try {
    const response = await api.post('/api/applications', applicationData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to create application');
  }
};

export const updateApplication = async (id, applicationData) => {
  try {
    const response = await api.put(`/api/applications/${id}`, applicationData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update application');
  }
};

export const deleteApplication = async (id) => {
  try {
    await api.delete(`/api/applications/${id}`);
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete application');
  }
};

export const regenerateApiKey = async (id) => {
  try {
    const response = await api.post(`/api/applications/${id}/regenerate-key`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to regenerate API key');
  }
}; 