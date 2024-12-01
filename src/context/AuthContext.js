import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('user');
      
      if (storedUser) {
        try {
          const response = await api.post('/api/auth/refresh');
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data));
        } catch (error) {
          localStorage.removeItem('user');
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    setUser(response.data.user);
    localStorage.setItem('user', JSON.stringify(response.data));
    navigate('/dashboard');
  };

  const logout = async () => {
    // First clear local state
    setUser(null);
    localStorage.removeItem('user');
    
    // Then navigate
    navigate('/login', { replace: true });
    
    // Finally, try to logout on server (but don't wait for it)
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
      // Ignore error since we've already cleared local state
    }
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 