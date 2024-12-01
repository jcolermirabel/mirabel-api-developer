import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true
});

// Add request interceptor to add auth headers
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  config.headers['X-Mirabel-API'] = process.env.REACT_APP_API_KEY;
  return config;
});

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (response.data.token) {
          // Update stored user data with new token
          const user = JSON.parse(localStorage.getItem('user'));
          user.token = response.data.token;
          localStorage.setItem('user', JSON.stringify(user));

          // Retry the original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, redirect to login
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API functions
export const getUsers = async () => {
  try {
    const response = await api.get('/api/users');
    console.log('Users API Response:', response);
    return response.data;
  } catch (error) {
    console.error('Users API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

// Export both the api instance and named functions
export { api as default }; 