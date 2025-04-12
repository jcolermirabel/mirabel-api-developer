import axios from 'axios';

// Use the correct backend port
const API_URL = 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const userData = JSON.parse(userStr);
    config.headers.Authorization = `Bearer ${userData.token}`;
  }
  return config;
});

export default api; 