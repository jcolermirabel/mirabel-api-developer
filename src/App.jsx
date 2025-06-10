import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import CreateRole from './components/roles/CreateRole';
import RoleEdit from './components/roles/RoleEdit';
import RoleList from './components/roles/RoleList';
import Login from './components/auth/Login';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import ServiceList from './components/services/ServiceList';
import UserList from './components/users/UserList';
import { SelectionProvider } from './context/SelectionContext';
import ApplicationList from './components/applications/ApplicationList';
import ApiDocViewer from './components/documentation/ApiDocViewer';
import ApiUsageReport from './components/reports/ApiUsageReport';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import UserSettings from './components/settings/UserSettings';
import AdminSettings from './components/settings/AdminSettings';
import ConnectionList from './components/connections/ConnectionList';
import { NotificationProvider } from './context/NotificationContext';

const ProtectedLayout = ({ children }) => {
  return (
    <Layout>
      {children}
    </Layout>
  );
};

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !user[requiredPermission]) {
    return <Navigate to="/dashboard" replace />;
  }

  return <ProtectedLayout>{children}</ProtectedLayout>;
};

function App() {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <SelectionProvider>
        <NotificationProvider>
          <Routes>
            <Route 
              path="/" 
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} 
            />
            
            <Route 
              path="/login" 
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
            />
            
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/connections" element={<ProtectedRoute><ConnectionList /></ProtectedRoute>} />
            <Route path="/services" element={<ProtectedRoute><ServiceList /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><UserList /></ProtectedRoute>} />
            <Route path="/roles" element={<ProtectedRoute><RoleList /></ProtectedRoute>} />
            <Route path="/roles/create" element={<ProtectedRoute><CreateRole mode="create" /></ProtectedRoute>} />
            <Route path="/roles/edit/:id" element={<ProtectedRoute><RoleEdit /></ProtectedRoute>} />
            <Route path="/applications" element={<ProtectedRoute><ApplicationList /></ProtectedRoute>} />
            <Route path="/documentation" element={<ProtectedRoute><ApiDocViewer /></ProtectedRoute>} />
            <Route path="/reports/api-usage" element={<ProtectedRoute><ApiUsageReport /></ProtectedRoute>} />
            <Route path="/user-settings" element={
              <ProtectedRoute>
                <UserSettings />
              </ProtectedRoute>
            } />
            <Route 
              path="/admin-settings" 
              element={
                <ProtectedRoute requiredPermission="isAdmin">
                  <AdminSettings />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </SelectionProvider>
    </LocalizationProvider>
  );
}

export default App; 