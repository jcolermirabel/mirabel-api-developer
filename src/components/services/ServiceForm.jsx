import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { createService, updateService } from '../../services/serviceService';
import { getConnections } from '../../services/connectionService';
import axios from 'axios';

const getAuthHeaders = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.token) {
    return { 
      'Authorization': `Bearer ${user.token}`,
      'x-mirabel-api-key': process.env.REACT_APP_API_KEY
    };
  }
  return {};
};

const ServiceForm = ({ service, onServiceSubmitted, title, onCancel }) => {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    connectionId: service?.connectionId || '',
    database: service?.database || ''
  });
  const [connections, setConnections] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [loadingDatabases, setLoadingDatabases] = useState(false);

  useEffect(() => {
    const fetchConnections = async () => {
      setLoadingConnections(true);
      try {
        const fetchedConnections = await getConnections();
        setConnections(fetchedConnections);
      } catch (err) {
        setError('Failed to load connections.');
      } finally {
        setLoadingConnections(false);
      }
    };
    fetchConnections();
  }, []);

  const handleConnectionChange = async (connectionId) => {
    setFormData(prev => ({
      ...prev,
      connectionId,
      database: '' // Reset database on new connection
    }));
    setDatabases([]);

    if (!connectionId) {
      return;
    }
    
    setLoadingDatabases(true);
    setError('');
    try {
      const response = await axios.get(
        `/api/connections/${connectionId}/databases`,
        { headers: getAuthHeaders() }
      );
      setDatabases(response.data);
    } catch (err) {
      setError('Failed to fetch databases for this connection.');
    } finally {
      setLoadingDatabases(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (service) {
        await updateService(service._id, formData);
      } else {
        await createService(formData);
      }
      onServiceSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', pt: '1rem !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <TextField
          label="Service Name"
          name="name"
          fullWidth
          required
          value={formData.name}
          onChange={handleChange}
        />

        <FormControl fullWidth required>
          <InputLabel id="connection-select-label">Connection</InputLabel>
          <Select
            labelId="connection-select-label"
            id="connection-select"
            value={formData.connectionId}
            label="Connection"
            onChange={(e) => handleConnectionChange(e.target.value)}
            disabled={loadingConnections}
          >
            {loadingConnections ? (
              <MenuItem value="">
                <em>Loading connections...</em>
              </MenuItem>
            ) : (
              connections.map((c) => (
                <MenuItem key={c._id} value={c._id}>
                  {c.name} ({c.host})
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

        <FormControl fullWidth required disabled={!formData.connectionId || loadingDatabases}>
          <InputLabel id="database-select-label">Database</InputLabel>
          <Select
            labelId="database-select-label"
            id="database-select"
            value={formData.database}
            label="Database"
            name="database"
            onChange={handleChange}
          >
            {loadingDatabases ? (
              <MenuItem value="">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <em>Loading databases...</em>
                </Box>
              </MenuItem>
            ) : (
              databases.map((db) => (
                <MenuItem key={db} value={db}>
                  {db}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={saving || !formData.connectionId || !formData.database}
          startIcon={saving && <CircularProgress size={20} />}
        >
          {saving ? 'Saving...' : 'Save Service'}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default ServiceForm; 