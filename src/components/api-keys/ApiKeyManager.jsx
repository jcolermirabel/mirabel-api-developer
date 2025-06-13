import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  IconButton,
  CircularProgress
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import LoadingSpinner from '../common/LoadingSpinner';
import { getEndpoints } from '../../services/endpointService';
import { getApiKeysForEndpoint, generateApiKey, revokeApiKey } from '../../services/apiKeyService';
import { useNotification } from '../../context/NotificationContext';
import ConfirmDialog from '../common/ConfirmDialog';

const ApiKeyManager = () => {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState({ open: false, keyId: null });
  const { showNotification } = useNotification();

  const fetchEndpointsWithKeys = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedEndpoints = await getEndpoints();
      const endpointsWithKeys = await Promise.all(
        fetchedEndpoints.map(async (endpoint) => {
          try {
            const keys = await getApiKeysForEndpoint(endpoint._id);
            // Assuming one key per endpoint for now as per the new design
            const activeKey = keys.find(k => k.isActive);
            return { 
              ...endpoint, 
              apiKey: activeKey ? activeKey.key : null,
              apiKeyId: activeKey ? activeKey._id : null
            };
          } catch (keyError) {
            // If fetching keys fails for one endpoint, we still show the endpoint
            console.error(`Failed to fetch key for endpoint ${endpoint.name}`, keyError);
            return { ...endpoint, apiKey: null, apiKeyId: null };
          }
        })
      );
      setEndpoints(endpointsWithKeys);
    } catch (err) {
      setError('Failed to fetch endpoints. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEndpointsWithKeys();
  }, [fetchEndpointsWithKeys]);

  const handleGenerateKey = async (endpointId) => {
    setGenerating(endpointId);
    try {
      await generateApiKey(endpointId);
      showNotification('API Key generated successfully. The new key is now active.', 'success');
      await fetchEndpointsWithKeys(); // Refresh list
    } catch (err) {
      showNotification(err.message || 'Failed to generate API Key.', 'error');
    } finally {
      setGenerating(null);
    }
  };

  const handleRevokeKey = async (apiKeyId) => {
    setConfirmRevoke({ open: false, keyId: null });
    setRevoking(apiKeyId);
    try {
      await revokeApiKey(apiKeyId);
      showNotification('API Key revoked successfully.', 'success');
      await fetchEndpointsWithKeys(); // Refresh list
    } catch (err) {
      showNotification(err.message || 'Failed to revoke API Key.', 'error');
    } finally {
      setRevoking(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('API Key copied to clipboard!', 'success');
    }, (err) => {
      showNotification('Failed to copy API Key.', 'error');
      console.error('Could not copy text: ', err);
    });
  };


  if (loading) return <LoadingSpinner />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      overflow: 'hidden',
      p: 1
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2
      }}>
        <Typography variant="h4">API Key Management</Typography>
        <IconButton onClick={fetchEndpointsWithKeys} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      <Box sx={{ 
        flex: 1,
        overflow: 'auto',
        width: '100%'
      }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none', width: '30%' }}>
                Endpoint Name
              </TableCell>
              <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none', width: '40%' }}>
                Active API Key
              </TableCell>
              <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none', width: '30%', textAlign: 'center' }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {endpoints.map((endpoint) => (
              <TableRow key={endpoint._id}>
                <TableCell>{endpoint.name}</TableCell>
                <TableCell>
                  {endpoint.apiKey ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                        {endpoint.apiKey}
                      </Typography>
                      <IconButton size="small" onClick={() => copyToClipboard(endpoint.apiKey)}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="textSecondary">
                      No key generated.
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  {endpoint.apiKey ? (
                    <Button 
                      variant="outlined" 
                      color="error"
                      onClick={() => setConfirmRevoke({ open: true, keyId: endpoint.apiKeyId })}
                      disabled={revoking === endpoint.apiKeyId}
                    >
                      {revoking === endpoint.apiKeyId ? <CircularProgress size={24} /> : 'Revoke Key'}
                    </Button>
                  ) : (
                    <Button 
                      variant="contained" 
                      startIcon={generating === endpoint._id ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                      onClick={() => handleGenerateKey(endpoint._id)}
                      disabled={generating === endpoint._id}
                    >
                      Generate Key
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <ConfirmDialog
        open={confirmRevoke.open}
        title="Revoke API Key"
        message="Are you sure you want to revoke this API key? This action is irreversible and will immediately block any applications using it."
        onConfirm={() => handleRevokeKey(confirmRevoke.keyId)}
        onCancel={() => setConfirmRevoke({ open: false, keyId: null })}
        aria-modal="true"
      />
    </Box>
  );
};

export default ApiKeyManager; 