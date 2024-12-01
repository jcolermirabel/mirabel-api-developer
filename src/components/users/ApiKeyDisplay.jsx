import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import { ContentCopy as CopyIcon } from '@mui/icons-material';
import { generateApiKey } from '../../services/userService';

const ApiKeyDisplay = ({ open, userId, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchApiKey = async () => {
      setLoading(true);
      setError('');
      try {
        const { apiKey } = await generateApiKey(userId);
        setApiKey(apiKey);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (open && userId) {
      fetchApiKey();
    }
  }, [open, userId, refreshTrigger]);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>API Key</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              value={apiKey}
              label="API Key"
              variant="outlined"
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <Tooltip title={copied ? "Copied!" : "Copy to clipboard"}>
                    <IconButton onClick={handleCopy}>
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                ),
              }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          variant="contained"
          disabled={loading}
        >
          Generate New Key
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApiKeyDisplay; 