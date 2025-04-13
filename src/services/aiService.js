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

export const generateResponse = async (prompt) => {
  try {
    const response = await axios.post(
      `${API_URL}/api/ai/generate`,
      { prompt },
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error(error.response?.data?.message || 'Failed to generate AI response');
  }
};

// Add any other AI-related API calls here 