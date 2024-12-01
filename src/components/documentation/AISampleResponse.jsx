import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  SmartToy as AIIcon
} from '@mui/icons-material';
import { generateSampleData } from '../../services/aiService';
import ResponseExamples from './ResponseExamples';

const OperationBadge = ({ type }) => {
  const getColor = () => {
    switch (type?.toLowerCase()) {
      case 'isselect': return 'success';
      case 'isinsert': return 'primary';
      case 'isupdate': return 'warning';
      case 'isdelete': return 'error';
      default: return 'default';
    }
  };

  const getLabel = () => {
    switch (type?.toLowerCase()) {
      case 'isselect': return 'SELECT';
      case 'isinsert': return 'INSERT';
      case 'isupdate': return 'UPDATE';
      case 'isdelete': return 'DELETE';
      default: return 'EXECUTE';
    }
  };

  return (
    <Chip
      label={getLabel()}
      color={getColor()}
      size="small"
      variant="outlined"
    />
  );
};

const AISampleResponse = ({ endpoint, onNewSample, onLoadingChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRegenerateSample = async () => {
    setLoading(true);
    setError(null);
    try {
      onLoadingChange?.(true);
      const newSample = await generateSampleData({
        procedure_name: endpoint.objectName,
        procedure_definition: endpoint.definition,
        parameters: endpoint.parameters
      });
      if (newSample) {
        onNewSample(newSample);
      }
    } catch (err) {
      setError('Failed to generate new sample');
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon fontSize="small" color="primary" />
          Sample Response
        </Typography>
        <OperationBadge type={endpoint.metadata?.operationType} />
        {endpoint.metadata?.affectedTables?.map(table => (
          <Chip
            key={table}
            label={`Table: ${table}`}
            size="small"
            variant="outlined"
          />
        ))}
        {endpoint.metadata?.errorHandling?.hasErrorHandling && (
          <Chip
            label="Has Error Handling"
            size="small"
            color="warning"
            variant="outlined"
          />
        )}
        <Button
          size="small"
          startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
          onClick={handleRegenerateSample}
          disabled={loading}
        >
          Regenerate Sample
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <ResponseExamples 
        samples={endpoint.responseExample} 
        metadata={endpoint.metadata}
      />
    </Box>
  );
};

export default AISampleResponse; 