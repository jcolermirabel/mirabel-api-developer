import axios from 'axios';
import { getAuthHeaders } from './utils';

const API_URL = process.env.REACT_APP_API_URL;

export const logActivity = async (action, details) => {
  try {
    await axios.post(
      `${API_URL}/audit/log`,
      { action, details },
      { headers: getAuthHeaders() }
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

export const getAuditLogs = async (filters) => {
  try {
    const response = await axios.get(
      `${API_URL}/audit/logs`,
      { 
        params: filters,
        headers: getAuthHeaders() 
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch audit logs');
  }
}; 