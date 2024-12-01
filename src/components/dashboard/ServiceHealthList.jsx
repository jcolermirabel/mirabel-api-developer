import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Box,
  Typography
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const ServiceHealthList = ({ services }) => {
  if (!services || services.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">No services to display</Typography>
      </Box>
    );
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <WarningIcon color="disabled" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <List>
      {services.map((service) => (
        <ListItem
          key={service._id}
          divider
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ListItemIcon>
              {getStatusIcon(service.status)}
            </ListItemIcon>
            <ListItemText
              primary={service.name}
              secondary={`${service.host}:${service.port}`}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              size="small"
              label={service.status || 'Unknown'}
              color={getStatusColor(service.status)}
            />
            <Typography variant="caption" color="text.secondary">
              {service.lastCheck ? new Date(service.lastCheck).toLocaleString() : 'Never checked'}
            </Typography>
          </Box>
        </ListItem>
      ))}
    </List>
  );
};

export default ServiceHealthList; 