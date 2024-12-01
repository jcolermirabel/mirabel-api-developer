import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes

export const useSessionTimeout = () => {
  const { logout } = useAuth();

  useEffect(() => {
    let timeoutId;
    
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(logout, TIMEOUT_DURATION);
    };

    const handleActivity = () => {
      resetTimeout();
    };

    // Set up event listeners for user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    // Initialize timeout
    resetTimeout();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [logout]);
}; 