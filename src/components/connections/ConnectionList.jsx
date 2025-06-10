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

const ConnectionList = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Placeholder for future connection management functionality
  useEffect(() => {
    // In the future, this would fetch stored database connections
    setLoading(false);
  }, []);

  const handleAddConnection = () => {
    // Placeholder for adding new connection
    console.log('Add connection clicked');
  };

  const handleEditConnection = (connectionId) => {
    // Placeholder for editing connection
    console.log('Edit connection:', connectionId);
  };

  const handleDeleteConnection = (connectionId) => {
    // Placeholder for deleting connection
    console.log('Delete connection:', connectionId);
  };

  const handleTestConnection = (connectionId) => {
    // Placeholder for testing connection
    console.log('Test connection:', connectionId);
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

      <Box sx={{ 
        flex: 1,
        overflow: 'auto',
        width: '100%'
      }}>
        {connections.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No database connections configured yet. Click "Add Connection" to create your first stored connection.
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
                  Database
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
                <TableRow key={connection.id}>
                  <TableCell>{connection.name}</TableCell>
                  <TableCell>{connection.host}</TableCell>
                  <TableCell>{connection.database}</TableCell>
                  <TableCell>{connection.status}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleTestConnection(connection.id)}>
                        <TestIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleEditConnection(connection.id)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleDeleteConnection(connection.id)}
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