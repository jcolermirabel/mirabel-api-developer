import axios from 'axios';
import { hashPassword, comparePassword } from '../utils/encryption';

const API_URL = process.env.REACT_APP_API_URL;

export const login = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.token) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    
    return response.data;
  } catch (error) {
    console.error('Login service error:', error);
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

export const register = async (userData) => {
  try {
    const hashedPassword = await hashPassword(userData.password);
    const response = await axios.post(`${API_URL}/api/auth/register`, {
      ...userData,
      password: hashedPassword
    });
    
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};

export const logout = () => {
  localStorage.removeItem('user');
};