import axios from 'axios';
// Remove the unused imports
// import { hashPassword, comparePassword } from '../utils/encryption';

// Use empty string for relative URL in production
const API_URL = process.env.REACT_APP_API_URL || '';

export const loginUser = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password
    });
    
    // Store user and token properly
    if (response.data && response.data.token) {
      localStorage.setItem('user', JSON.stringify(response.data));
      console.log('User logged in and stored:', response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logoutUser = () => {
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Simplify the registerUser function
export const registerUser = async (userData) => {
  const response = await axios.post(`${API_URL}/api/auth/register`, userData);
  return response.data;
};

export const isAuthenticated = () => {
  const user = getCurrentUser();
  return !!user && !!user.token;
};

export const getToken = () => {
  const user = getCurrentUser();
  return user ? user.token : null;
};