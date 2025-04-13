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
import { createService, testConnection, updateService, refreshServiceSchema } from '../../services/serviceService';

const ServiceForm = ({ service, onServiceSubmitted, title, onCancel }) => {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    host: service?.host || '',
    failoverHost: service?.failoverHost || '',
    port: service?.port || '',
    database: service?.database || '',
    username: service?.username || '',
    password: service?.password || '',
    instanceName: service?.instanceName || ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [testing, setTesting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'password') {
      setPasswordChanged(true);
      // Check for colons in password
      if (value.includes(':')) {
        setPasswordError('Password cannot contain colon (:) characters');
      } else {
        setPasswordError('');
      }
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setError('');
    setSuccess('');
    try {
      const testConfig = {
        name: formData.name,
        host: formData.host,
        port: formData.port,
        database: formData.database,
        username: formData.username,
        password: formData.password
      };
      
      const response = await testConnection(testConfig);
      if (response.success) {
        setSuccess('Connection successful!');
      } else {
        setError(response.error || 'Connection failed');
      }
    } catch (error) {
      setError(error.message || 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent submission if password contains colon
    if (passwordChanged && formData.password.includes(':')) {
      setError('Password cannot contain colon (:) characters');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
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
        
        // After successful update, refresh the schema
        try {
          const schemaResult = await refreshServiceSchema(service._id);
          setSuccess(`Service updated and schema refreshed: ${schemaResult.objectCount.total} objects found (${schemaResult.objectCount.tables} tables, ${schemaResult.objectCount.views} views, ${schemaResult.objectCount.procedures} procedures)`);
          
          // Wait for user to see the success message before closing
          setTimeout(() => {
            onServiceSubmitted();
          }, 3000);
        } catch (schemaError) {
          console.error('Error refreshing schema:', schemaError);
          setSuccess('Service updated successfully, but schema refresh failed.');
          setTimeout(() => {
            onServiceSubmitted();
          }, 3000);
        }
      } else {
        await createService(dataToSubmit);
        setSuccess('Service created successfully!');
        setTimeout(() => {
          onServiceSubmitted();
        }, 2000);
      }
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
            severity="error"
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}
        {success && (
          <Alert 
            severity="success"
            sx={{ mb: 2 }}
          >
            {success}
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
          helperText="Primary host address"
        />
        <TextField
          margin="dense"
          label="Failover Host"
          name="failoverHost"
          fullWidth
          value={formData.failoverHost}
          onChange={handleChange}
          helperText="Optional backup host address"
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
          error={passwordChanged && !!passwordError}
          helperText={passwordChanged && passwordError ? passwordError : "Password will only be updated if changed"}
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
          disabled={saving || testing}
          startIcon={testing && <CircularProgress size={20} />}
        >
          Test Connection
        </Button>
        <Button
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={saving || (passwordChanged && !!passwordError)}
          startIcon={saving && <CircularProgress size={20} />}
        >
          {service ? "Update Service" : "Create Service"}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default ServiceForm; 