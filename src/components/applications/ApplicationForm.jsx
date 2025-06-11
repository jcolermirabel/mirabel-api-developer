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
  FormControlLabel,
  Checkbox,
  MenuItem
} from '@mui/material';
import { createApplication, updateApplication } from '../../services/applicationService';
import { getRoles } from '../../services/roleService';

const ApplicationForm = ({ application, onSubmitted, onCancel }) => {
  const [formData, setFormData] = useState({
    name: application?.name || '',
    description: application?.description || '',
    apiKey: application?.apiKey || '',
    defaultRole: application?.defaultRole?._id || '',
    isActive: application?.isActive ?? true
  });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await getRoles();
        setRoles(data);
      } catch (err) {
        setError('Failed to fetch roles');
      }
    };
    fetchRoles();
  }, []);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'isActive' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (application) {
        await updateApplication(application._id, formData);
      } else {
        await createApplication(formData);
      }
      onSubmitted();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <DialogTitle>
        {application ? 'Edit Application' : 'Create New Application'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          margin="dense"
          label="Application Name"
          name="name"
          fullWidth
          required
          value={formData.name}
          onChange={handleChange}
        />

        <TextField
          margin="dense"
          label="Description"
          name="description"
          fullWidth
          multiline
          rows={3}
          value={formData.description}
          onChange={handleChange}
        />

        <TextField
          margin="dense"
          label="API Key"
          name="apiKey"
          fullWidth
          value={formData.apiKey}
          onChange={handleChange}
          helperText="Leave blank to generate a new key."
        />

        <TextField
          select
          margin="dense"
          label="Default Role"
          name="defaultRole"
          fullWidth
          required
          value={formData.defaultRole}
          onChange={handleChange}
        >
          {roles.map((role) => (
            <MenuItem key={role._id} value={role._id}>
              {role.name}
            </MenuItem>
          ))}
        </TextField>

        <FormControlLabel
          control={
            <Checkbox
              checked={formData.isActive}
              onChange={handleChange}
              name="isActive"
            />
          }
          label="Active"
          sx={{ mt: 2 }}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {application ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default ApplicationForm; 