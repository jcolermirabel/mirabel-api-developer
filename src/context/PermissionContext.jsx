import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const PermissionContext = createContext(null);

export const PermissionProvider = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({
    canViewDashboard: true,
    canManageServices: true,
    canManageEndpoints: true,
    canManageApiKeys: true,
    canManageUsers: true,
    canViewDocs: true
  });

  useEffect(() => {
    if (user?.permissions) {
      setPermissions(user.permissions);
    }
  }, [user]);

  return (
    <PermissionContext.Provider value={permissions}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === null) {
    // Return default permissions instead of throwing error
    return {
      canViewDashboard: true,
      canManageServices: true,
      canManageEndpoints: true,
      canManageApiKeys: true,
      canManageUsers: true,
      canViewDocs: true
    };
  }
  return context;
}; 