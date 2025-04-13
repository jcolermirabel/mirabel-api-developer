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

export const getAuditLogs = async (filters = {}) => {
  try {
    const response = await axios.get(`${API_URL}/api/audit`, {
      params: filters,
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
};

export const getAuditLog = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/api/audit/${id}`, {
      headers: getAuthHeaders(),
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching audit log ${id}:`, error);
    throw error;
  }
};

// Add any other audit-related API calls here 