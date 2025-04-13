import axios from 'axios';
import { getToken } from './authService';

// Use empty string for relative path in production
const API_URL = process.env.REACT_APP_API_URL || '';

const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const getDashboardMetrics = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/dashboard/metrics`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    throw new Error('Failed to fetch dashboard metrics');
  }
};

// Add any other dashboard-related API calls here 