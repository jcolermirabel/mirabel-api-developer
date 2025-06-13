import { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Storage,
  Person,
  Logout,
  DarkMode,
  LightMode,
  Dashboard as DashboardIcon,
  ChevronLeft as ChevronLeftIcon,
  Description as DocsIcon,
  Assessment as ReportIcon,
  Settings as SettingsIcon,
  Cable as ConnectionIcon,
  VpnKey as ApiKeyIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePermissions } from '../../context/PermissionContext';

const drawerWidth = 240;

const Navigation = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useTheme();
  const permissions = usePermissions();

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      permission: 'canViewDashboard'
    },
    {
      text: 'Connections',
      icon: <ConnectionIcon />,
      path: '/connections',
      permission: 'canManageServices'
    },
    {
      text: 'Endpoints',
      icon: <Storage />,
      path: '/endpoints',
      permission: 'canManageEndpoints'
    },
    {
      text: 'API Keys',
      icon: <ApiKeyIcon />,
      path: '/api-keys',
      permission: 'canManageApiKeys'
    },
    {
      text: 'Users',
      icon: <Person />,
      path: '/users',
      permission: 'canManageUsers'
    },
    {
      text: 'API Documentation',
      icon: <DocsIcon />,
      path: '/documentation',
      permission: 'canViewDocs'
    },
    {
      text: 'API Usage Report',
      icon: <ReportIcon />,
      path: '/reports/api-usage',
      permission: 'canViewDashboard'
    }
  ];

  const settingsMenuItem = {
    text: user?.name || user?.email,
    icon: <SettingsIcon />,
    path: permissions.isAdmin ? '/admin-settings' : '/user-settings',
    permission: 'canAccessSettings'
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const toggleDrawerCollapse = () => {
    setIsDrawerCollapsed(!isDrawerCollapsed);
  };

  const drawer = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {!isDrawerCollapsed && (
          <Typography variant="h6" noWrap component="div">
            Mirabel Connect
          </Typography>
        )}
        <IconButton onClick={toggleDrawerCollapse}>
          <ChevronLeftIcon />
        </IconButton>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          !item.hidden && permissions[item.permission] && (
            <ListItemButton
              key={item.text}
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              {!isDrawerCollapsed && <ListItemText primary={item.text} />}
            </ListItemButton>
          )
        ))}
      </List>
      <Box sx={{ marginTop: 'auto' }}>
        <Divider />
        <List>
          <ListItemButton
            selected={location.pathname === settingsMenuItem.path}
            onClick={() => navigate(settingsMenuItem.path)}
          >
            <ListItemIcon>
              {settingsMenuItem.icon}
            </ListItemIcon>
            {!isDrawerCollapsed && (
              <ListItemText primary={settingsMenuItem.text} />
            )}
          </ListItemButton>
        </List>
      </Box>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${isDrawerCollapsed ? 64 : drawerWidth}px)` },
          ml: { sm: isDrawerCollapsed ? 64 : drawerWidth },
          transition: 'width 0.2s, margin-left 0.2s',
          background: '#0c3d87'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          </Typography>
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton
                color="inherit"
                onClick={toggleTheme}
                sx={{ mr: 2 }}
              >
                {isDarkMode ? <LightMode /> : <DarkMode />}
              </IconButton>
              <Typography variant="body2" sx={{ mr: 2 }}>
                {user.email}
              </Typography>
              <Button
                color="inherit"
                onClick={logout}
                startIcon={<Logout />}
              >
                Logout
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{
          width: { sm: isDrawerCollapsed ? 64 : drawerWidth },
          flexShrink: { sm: 0 },
          transition: 'width 0.2s'
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: isDrawerCollapsed ? 64 : drawerWidth,
              transition: 'width 0.2s'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
    </Box>
  );
};

export default Navigation; 