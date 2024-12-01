import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import { createService, testConnection, updateService } from '../../services/serviceService';

const ServiceForm = ({ service, onServiceSubmitted, title }) => {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    host: service?.host || '',
    port: service?.port || '',
    database: service?.database || '',
    username: service?.username || '',
    password: service?.password || '',
    instanceName: service?.instanceName || ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'password') {
      setPasswordChanged(true);
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTestConnection = async () => {
    try {
      const testConfig = {
        name: formData.name,
        host: formData.host,
        port: formData.port,
        database: formData.database,
        username: formData.username,
        password: formData.password
      };
      
      // Test the connection
      const response = await testConnection(testConfig);
      if (response.success) {
        setError('Connection successful!');
      } else {
        setError(response.error || 'Connection failed');
      }
    } catch (error) {
      setError(error.message || 'Connection failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const dataToSubmit = {
        ...formData,
        password: passwordChanged ? formData.password : service?.password
      };
      
      console.log('ServiceForm - submitting password:', {
        isChanged: passwordChanged,
        hasColon: dataToSubmit.password.includes(':'),
        length: dataToSubmit.password.length
      });
      
      if (service) {
        await updateService(service._id, dataToSubmit);
      } else {
        await createService(dataToSubmit);
      }
      onServiceSubmitted();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert 
            severity={error.includes('successful') ? 'success' : 'error'}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <TextField
          margin="dense"
          label="Service Name"
          name="name"
          fullWidth
          required
          value={formData.name}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label="Host"
          name="host"
          fullWidth
          required
          value={formData.host}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label="Port"
          name="port"
          type="number"
          fullWidth
          required
          value={formData.port}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label="Database"
          name="database"
          fullWidth
          required
          value={formData.database}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label="Username"
          name="username"
          fullWidth
          required
          value={formData.username}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label="Password"
          name="password"
          type="password"
          fullWidth
          required
          value={passwordChanged ? formData.password : '••••••••'}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label="Instance Name (Optional)"
          name="instanceName"
          fullWidth
          value={formData.instanceName}
          onChange={handleChange}
          helperText="Leave empty if using IP and port"
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleTestConnection}
          disabled={saving}
          startIcon={<CircularProgress size={20} />}
        >
          Test Connection
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={saving}
          startIcon={saving && <CircularProgress size={20} />}
        >
          {service ? 'Update Service' : 'Create Service'}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default ServiceForm; 