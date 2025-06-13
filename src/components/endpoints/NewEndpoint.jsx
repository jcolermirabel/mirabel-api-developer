import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  CircularProgress
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import { createEndpoint } from '../../services/endpointService';
import { useNotification } from '../../context/NotificationContext';

const NewEndpoint = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim()) {
      setError('Both name and description are required.');
      return;
    }

    setSaving(true);
    setError('');
    
    try {
      await createEndpoint(formData);
      showNotification('Endpoint created successfully!', 'success');
      navigate('/endpoints');
    } catch (err) {
      setError(err.message || 'Failed to create endpoint');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/endpoints');
  };

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      overflow: 'hidden',
      p: 2
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        mb: 3
      }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleCancel}
          sx={{ mr: 2 }}
        >
          Back to Endpoints
        </Button>
        <Typography variant="h4">Add New Endpoint</Typography>
      </Box>

      <Paper sx={{ p: 3, maxWidth: 600 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Endpoint Name"
              name="name"
              fullWidth
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., usp_GetUserDetails"
              disabled={saving}
            />

            <TextField
              label="Description"
              name="description"
              fullWidth
              required
              multiline
              rows={4}
              value={formData.description}
              onChange={handleChange}
              placeholder="A brief description of what this endpoint does."
              disabled={saving}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={saving || !formData.name.trim() || !formData.description.trim()}
              >
                {saving ? 'Creating...' : 'Create Endpoint'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default NewEndpoint; 