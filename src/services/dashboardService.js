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

export const getDashboardMetrics = async () => {
  try {
    const response = await axios.get(`${API_URL}/dashboard/metrics`, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    throw new Error('Failed to fetch dashboard metrics');
  }
}; 