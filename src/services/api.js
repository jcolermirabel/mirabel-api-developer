import axios from 'axios';

// Use empty string for relative URL in production
const API_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      if (userData && userData.token) {
        config.headers.Authorization = `Bearer ${userData.token}`;
      }
    }
  } catch (error) {
    console.error('Error setting auth token:', error);
  }
  return config;
});

export default api; 