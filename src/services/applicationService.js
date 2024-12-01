import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL + '/api';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).token}`,
  'X-Mirabel-API': process.env.REACT_APP_API_KEY
});

export const getApplications = async () => {
  try {
    const response = await axios.get(
      `${API_URL}/applications`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch applications');
  }
};

export const createApplication = async (applicationData) => {
  try {
    const response = await axios.post(
      `${API_URL}/applications`,
      applicationData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to create application');
  }
};

export const updateApplication = async (id, applicationData) => {
  try {
    const response = await axios.put(
      `${API_URL}/applications/${id}`,
      applicationData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update application');
  }
};

export const deleteApplication = async (id) => {
  try {
    await axios.delete(
      `${API_URL}/applications/${id}`,
      { headers: getAuthHeaders() }
    );
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to delete application');
  }
};

export const regenerateApiKey = async (id) => {
  try {
    const response = await axios.post(
      `${API_URL}/applications/${id}/regenerate-key`,
      {},
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to regenerate API key');
  }
}; 