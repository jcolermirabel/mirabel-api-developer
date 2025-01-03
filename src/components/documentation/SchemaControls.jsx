import { 
  Box, 
  IconButton, 
  Tooltip, 
  Typography,
  CircularProgress
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon 
} from '@mui/icons-material';
import { useState } from 'react';
import axios from 'axios';

const SchemaControls = ({ endpoint, onSchemaUpdate }) => {
  const [refreshing, setRefreshing] = useState(false);
  const lastUpdate = new Date(endpoint.metadata?.schemaLastUpdated);
  const isStale = Date.now() - lastUpdate > 7 * 24 * 60 * 60 * 1000; // 7 days

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await axios.post(
        `/api/documentation/refresh-schema/${endpoint.roleId}/${endpoint.permissionId}`,
        null,
        {
          headers: {
            'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).token}`,
            'x-mirabel-api-key': process.env.REACT_APP_API_KEY
          }
        }
      );
      onSchemaUpdate(response.data.schema);
    } catch (error) {
      console.error('Failed to refresh schema:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tooltip title={`Schema last updated: ${lastUpdate.toLocaleString()}`}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isStale ? (
            <WarningIcon color="warning" fontSize="small" />
          ) : (
            <CheckCircleIcon color="success" fontSize="small" />
          )}
          <Typography variant="caption" sx={{ ml: 0.5 }}>
            {isStale ? 'Schema may be outdated' : 'Schema up to date'}
          </Typography>
        </Box>
      </Tooltip>
      
      <Tooltip title="Refresh schema">
        <IconButton 
          size="small" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <CircularProgress size={20} />
          ) : (
            <RefreshIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default SchemaControls; 