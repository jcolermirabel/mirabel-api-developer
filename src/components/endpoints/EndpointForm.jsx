import { useState, useEffect } from 'react';
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

const EndpointForm = ({ endpoint, onSave, title, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (endpoint) {
      setFormData({
        name: endpoint.name || '',
        description: endpoint.description || ''
      });
    } else {
      setFormData({
        name: '',
        description: ''
      });
    }
  }, [endpoint]);

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
    try {
      await onSave(formData);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', pt: '1rem !important' }}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="Endpoint Name"
          name="name"
          fullWidth
          required
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., usp_GetUserDetails"
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
        />

      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={saving || !formData.name || !formData.description}
          startIcon={saving && <CircularProgress size={20} />}
        >
          {saving ? 'Saving...' : 'Save Endpoint'}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default EndpointForm; 