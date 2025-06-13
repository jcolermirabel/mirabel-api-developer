import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Alert
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { getEndpoints } from '../../services/endpointService';
import LoadingSpinner from '../common/LoadingSpinner';
import ExportMenu from '../common/ExportMenu';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

const EndpointList = () => {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchEndpoints = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEndpoints();
      setEndpoints(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch endpoints');
      console.error('Fetch endpoints error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  const prepareExportData = () => {
    return endpoints.map(endpoint => ({
      Name: endpoint.name,
      Description: endpoint.description,
      CreatedAt: new Date(endpoint.createdAt).toLocaleString(),
      UpdatedAt: new Date(endpoint.updatedAt).toLocaleString()
    }));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      overflow: 'hidden',
      p: 1
    }}>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 1
      }}>
        <Typography variant="h4">Universal API Endpoints</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ExportMenu 
            data={prepareExportData()}
            filename="universal-endpoints"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/endpoints/new')}
          >
            Add Endpoint
          </Button>
        </Box>
      </Box>

      <Box sx={{ 
        flex: 1,
        overflow: 'auto',
        width: '100%'
      }}>
        <Table 
          stickyHeader 
          size="small"
          sx={{ width: '100%' }}
        >
          <TableHead>
            <TableRow>
              <TableCell 
                sx={{ 
                  backgroundColor: '#1e2a3b',
                  color: 'white',
                  width: '35%',
                  borderBottom: 'none'
                }}
              >
                Name
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: '#1e2a3b',
                  color: 'white',
                  width: '65%',
                  borderBottom: 'none'
                }}
              >
                Description
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {endpoints.map((endpoint) => (
              <TableRow 
                key={endpoint._id}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                <TableCell>{endpoint.name}</TableCell>
                <TableCell>{endpoint.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};

export default EndpointList; 