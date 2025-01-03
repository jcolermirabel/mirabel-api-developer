import { useState, useEffect } from 'react';
import { 
  Box, 
  CircularProgress, 
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Tooltip
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import axios from 'axios';
import EndpointDetails from './EndpointDetails';

const API_URL = process.env.REACT_APP_API_URL;

const ApiDocViewer = () => {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch roles on component mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/roles`, {
          headers: {
            'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).token}`,
            'x-mirabel-api-key': process.env.REACT_APP_API_KEY
          }
        });
        setRoles(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load roles');
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  // Fetch endpoints when role is selected
  const handleRoleChange = async (event) => {
    const roleId = event.target.value;
    setSelectedRole(roleId);
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/api/documentation/role/${roleId}`, {
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).token}`,
          'x-mirabel-api-key': process.env.REACT_APP_API_KEY
        }
      });
      setEndpoints(response.data.endpoints);
    } catch (err) {
      setError('Failed to load documentation');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRefresh = async () => {
    if (!selectedRole) return;
    
    setRefreshing(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/documentation/refresh-schemas/${selectedRole}`,
        null,
        {
          headers: {
            'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).token}`,
            'x-mirabel-api-key': process.env.REACT_APP_API_KEY
          }
        }
      );
      
      // Refetch endpoints to get updated schemas
      const updatedData = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/documentation/role/${selectedRole}`,
        {
          headers: {
            'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).token}`,
            'x-mirabel-api-key': process.env.REACT_APP_API_KEY
          }
        }
      );
      
      setEndpoints(updatedData.data.endpoints);
    } catch (err) {
      setError('Failed to refresh schemas');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSchemaUpdate = (endpointPath, newSchema) => {
    setEndpoints(prevEndpoints => 
      prevEndpoints.map(endpoint => 
        endpoint.path === endpointPath 
          ? { ...endpoint, schema: newSchema }
          : endpoint
      )
    );
  };

  if (loading && !roles.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <FormControl fullWidth>
          <InputLabel>Select Role</InputLabel>
          <Select
            value={selectedRole}
            onChange={handleRoleChange}
            label="Select Role"
          >
            {roles.map((role) => (
              <MenuItem key={role._id} value={role._id}>
                {role.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedRole && (
          <Tooltip title="Refresh all schemas">
            <Button
              variant="outlined"
              startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
              onClick={handleBulkRefresh}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh All'}
            </Button>
          </Tooltip>
        )}
      </Box>

      {selectedRole && loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {selectedRole && !loading && endpoints.length === 0 && (
        <Alert severity="info">
          No endpoints found for this role
        </Alert>
      )}

      {selectedRole && !loading && endpoints.map((endpoint, index) => (
        <EndpointDetails 
          key={`${endpoint.path}-${index}`} 
          endpoint={endpoint}
          onSchemaUpdate={handleSchemaUpdate}
        />
      ))}
    </Box>
  );
};

export default ApiDocViewer; 