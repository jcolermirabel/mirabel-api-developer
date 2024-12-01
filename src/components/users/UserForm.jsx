import { useState } from 'react';
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
  Checkbox
} from '@mui/material';
import { createUser, updateUser } from '../../services/userService';

const UserForm = ({ user, onUserSubmitted }) => {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    password: '',
    isAdmin: user?.isAdmin || false
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'isAdmin' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (user) {
        // Don't send password if it's empty (no password change)
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await updateUser(user._id, updateData);
      } else {
        await createUser(formData);
      }
      onUserSubmitted();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <DialogTitle>{user ? 'Edit User' : 'Add New User'}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          margin="dense"
          label="First Name"
          name="firstName"
          fullWidth
          required
          value={formData.firstName}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label="Last Name"
          name="lastName"
          fullWidth
          required
          value={formData.lastName}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label="Email"
          name="email"
          type="email"
          fullWidth
          required
          value={formData.email}
          onChange={handleChange}
        />
        <TextField
          margin="dense"
          label={user ? "New Password (leave blank to keep current)" : "Password"}
          name="password"
          type="password"
          fullWidth
          required={!user}
          value={formData.password}
          onChange={handleChange}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.isAdmin}
              onChange={handleChange}
              name="isAdmin"
            />
          }
          label="Administrator"
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button
          type="submit"
          variant="contained"
          disabled={saving}
          startIcon={saving && <CircularProgress size={20} />}
        >
          {user ? 'Update User' : 'Create User'}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default UserForm; 