import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import { getTableDetails } from '../../services/schemaService';

const TableDetails = ({ serviceId, objectName, type }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTableDetails(serviceId, objectName);
      setDetails(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch object details');
    } finally {
      setLoading(false);
    }
  }, [serviceId, objectName]);

  useEffect(() => {
    if (serviceId && objectName) {
      fetchDetails();
    }
  }, [fetchDetails, serviceId, objectName]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!details) return null;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {objectName}
      </Typography>
      <Chip
        label={type.toUpperCase()}
        color={type === 'table' ? 'primary' : type === 'view' ? 'secondary' : 'default'}
        size="small"
        sx={{ mb: 2 }}
      />

      {details.description && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Description
          </Typography>
          <Typography>{details.description}</Typography>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" gutterBottom>
        Columns
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Nullable</TableCell>
            <TableCell>Default</TableCell>
            <TableCell>Key</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {details.columns.map((column) => (
            <TableRow key={column.name}>
              <TableCell>{column.name}</TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {column.type}
                  {column.length ? `(${column.length})` : ''}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={column.nullable ? 'NULL' : 'NOT NULL'}
                  size="small"
                  color={column.nullable ? 'default' : 'primary'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                {column.default !== undefined ? (
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {column.default}
                  </Typography>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                {column.isPrimary && (
                  <Chip label="PK" size="small" color="primary" />
                )}
                {column.isForeign && (
                  <Chip 
                    label="FK" 
                    size="small" 
                    color="secondary"
                    sx={{ ml: column.isPrimary ? 1 : 0 }}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {details.indexes && details.indexes.length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>
            Indexes
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Columns</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {details.indexes.map((index) => (
                <TableRow key={index.name}>
                  <TableCell>{index.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={index.type}
                      size="small"
                      color={index.type === 'PRIMARY' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {index.columns.map((col) => (
                      <Chip
                        key={col}
                        label={col}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5 }}
                      />
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {type === 'view' && details.definition && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>
            View Definition
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              backgroundColor: (theme) => 
                theme.palette.mode === 'dark' ? '#1a2027' : '#f5f5f5',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              overflowX: 'auto'
            }}
          >
            {details.definition}
          </Paper>
        </>
      )}
    </Paper>
  );
};

export default TableDetails; 