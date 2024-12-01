import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { PermissionProvider } from './context/PermissionContext';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <PermissionProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </PermissionProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  </React.StrictMode>
); 