import { usePermissions } from '../../context/PermissionContext';

const ProtectedComponent = ({ permission, children, fallback = null }) => {
  const permissions = usePermissions();
  
  if (!permissions[permission]) {
    return fallback;
  }

  return children;
};

export default ProtectedComponent; 