import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).token}`,
  'x-mirabel-api-key': process.env.REACT_APP_API_KEY
});

export const getSchemaInfo = async (serviceId) => {
  try {
    const response = await axios.get(
      `${API_URL}/services/${serviceId}/schema`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch schema information');
  }
};

export const getTableDetails = async (serviceId, tableName) => {
  try {
    const response = await axios.get(
      `${API_URL}/services/${serviceId}/schema/${tableName}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch table details');
  }
}; 