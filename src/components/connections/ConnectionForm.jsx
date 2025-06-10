import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box
} from '@mui/material';
import { PlayArrow as TestIcon } from '@mui/icons-material';

const ConnectionForm = ({ open, onClose, onSave, connection, onTestConnection }) => {
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 1433,
    failoverHost: '',
    username: '',
    password: ''
  });

  useEffect(() => {
    if (connection) {
      setFormData({
        name: connection.name || '',
        host: connection.host || '',
        port: connection.port || 1433,
        failoverHost: connection.failoverHost || '',
        username: connection.username || '',
        password: '' // Always keep password empty for security
      });
    } else {
      setFormData({ name: '', host: '', port: 1433, failoverHost: '', username: '', password: '' });
    }
  }, [connection, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Filter out empty password string if not changed
    const dataToSave = { ...formData };
    if (!dataToSave.password) {
      delete dataToSave.password;
    }
    onSave(dataToSave);
  };

  const handleTest = () => {
    onTestConnection(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ component: 'form', onSubmit: handleSubmit }}>
      <DialogTitle>{connection ? 'Edit Connection' : 'Add New Connection'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Connection Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            fullWidth
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Host"
              name="host"
              value={formData.host}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              label="Port"
              name="port"
              type="number"
              value={formData.port}
              onChange={handleChange}
              required
              sx={{ width: '120px' }}
            />
          </Box>
          <TextField
            label="Failover Host"
            name="failoverHost"
            value={formData.failoverHost}
            onChange={handleChange}
            fullWidth
            helperText="Optional: for database mirroring"
          />
          <TextField
            label="Username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            fullWidth
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            fullWidth
            helperText={connection ? "Leave blank to keep current password" : ""}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Button 
          onClick={handleTest}
          startIcon={<TestIcon />}
        >
          Test Connection
        </Button>
        <Box>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">Save</Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ConnectionForm; 