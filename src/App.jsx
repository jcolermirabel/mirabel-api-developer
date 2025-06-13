import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/auth/Login';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import EndpointList from './components/endpoints/EndpointList';
import NewEndpoint from './components/endpoints/NewEndpoint';
import UserList from './components/users/UserList';
import { SelectionProvider } from './context/SelectionContext';
import ApiDocViewer from './components/documentation/ApiDocViewer';
import ApiUsageReport from './components/reports/ApiUsageReport';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import UserSettings from './components/settings/UserSettings';
import AdminSettings from './components/settings/AdminSettings';
import ConnectionList from './components/connections/ConnectionList';
import { NotificationProvider } from './context/NotificationContext';
import ApiKeyManager from './components/api-keys/ApiKeyManager';

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
            <Route path="/endpoints" element={<ProtectedRoute><EndpointList /></ProtectedRoute>} />
            <Route path="/endpoints/new" element={<ProtectedRoute><NewEndpoint /></ProtectedRoute>} />
            <Route path="/api-keys" element={<ProtectedRoute><ApiKeyManager /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><UserList /></ProtectedRoute>} />
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