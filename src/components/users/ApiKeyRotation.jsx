import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Box
} from '@mui/material';
import { generateApiKey } from '../../services/userService';

const ApiKeyRotation = ({ open, userId, onClose, onKeyRotated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRotateKey = async () => {
    setLoading(true);
    setError('');
    try {
      await generateApiKey(userId);
      onKeyRotated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rotate API Key</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ mb: 2 }}>
          <Typography color="warning.main" gutterBottom>
            Warning: This action will invalidate the current API key.
          </Typography>
          <Typography>
            All applications using the current API key will need to be updated with the new key.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleRotateKey}
          variant="contained"
          color="warning"
          disabled={loading}
        >
          Rotate Key
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApiKeyRotation; 