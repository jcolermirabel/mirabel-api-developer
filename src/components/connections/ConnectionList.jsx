import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as TestIcon
} from '@mui/icons-material';
import LoadingSpinner from '../common/LoadingSpinner';
import { getConnections, createConnection, updateConnection, deleteConnection, testConnection, testConnectionDetails } from '../../services/connectionService';
import ConnectionForm from './ConnectionForm';
import { useNotification } from '../../context/NotificationContext';

const ConnectionList = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const { showNotification } = useNotification();

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const fetchedConnections = await getConnections();
      setConnections(fetchedConnections);
    } catch (err) {
      setError('Failed to fetch connections. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleAddConnection = () => {
    setSelectedConnection(null);
    setIsFormOpen(true);
  };

  const handleEditConnection = (connection) => {
    setSelectedConnection(connection);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedConnection(null);
  };

  const handleSaveConnection = async (connectionData) => {
    try {
      if (selectedConnection) {
        await updateConnection(selectedConnection._id, connectionData);
      } else {
        await createConnection(connectionData);
      }
      await fetchConnections(); // Refetch all connections
      handleFormClose();
    } catch (err) {
      setError(`Failed to save connection: ${err.message || err}`);
      console.error(err);
      // Keep form open on error
    }
  };

  const handleDeleteConnection = async (connectionId) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      try {
        await deleteConnection(connectionId);
        setConnections(connections.filter(c => c._id !== connectionId));
        showNotification('Connection deleted successfully.', 'success');
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'Failed to delete connection.';
        showNotification(errorMessage, 'error');
        console.error(err);
      }
    }
  };

  const handleTestConnection = async (connectionId) => {
    try {
      const result = await testConnection(connectionId);
      if (result.success) {
        showNotification(result.message, 'success');
      } else {
        showNotification(result.message, 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Failed to test connection.', 'error');
      console.error(err);
    }
  };

  const handleTestConnectionDetails = async (connectionData) => {
    // Filter out empty password if we are editing and not changing it
    const dataToTest = { ...connectionData };
    if (selectedConnection && !dataToTest.password) {
      delete dataToTest.password;
    }

    try {
      const result = await testConnectionDetails(dataToTest);
      if (result.success) {
        showNotification(result.message, 'success');
      } else {
        showNotification(result.error || 'Connection test failed', 'error');
      }
    } catch (err) {
      showNotification(err.message || 'Failed to test connection.', 'error');
      console.error(err);
    }
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
        <Typography variant="h4">Database Connections</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddConnection}
        >
          Add Connection
        </Button>
      </Box>

      <ConnectionForm
        open={isFormOpen}
        onClose={handleFormClose}
        onSave={handleSaveConnection}
        connection={selectedConnection}
        onTestConnection={handleTestConnectionDetails}
      />

      <Box sx={{ 
        flex: 1,
        overflow: 'auto',
        width: '100%'
      }}>
        {connections.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No database connections configured yet. Click &quot;Add Connection&quot; to create your first stored connection.
          </Alert>
        ) : (
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none' }}>
                  Name
                </TableCell>
                <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none' }}>
                  Host
                </TableCell>
                <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none' }}>
                  Status
                </TableCell>
                <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none', width: '150px' }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {connections.map((connection) => (
                <TableRow key={connection._id}>
                  <TableCell>{connection.name}</TableCell>
                  <TableCell>
                    {connection.host}
                    {connection.failoverHost && (
                      <Typography variant="caption" display="block" color="textSecondary">
                        Mirror: {connection.failoverHost}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{connection.status || 'N/A'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleTestConnection(connection._id)}>
                        <TestIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleEditConnection(connection)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleDeleteConnection(connection._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>
    </Box>
  );
};

export default ConnectionList; 