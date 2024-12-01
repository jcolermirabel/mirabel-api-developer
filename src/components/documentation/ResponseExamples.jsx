import {
  Box,
  Typography,
  Tabs,
  Tab,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';

const ResponseExamples = ({ samples, metadata }) => {
  const [activeTab, setActiveTab] = useState(0);

  const getErrorSeverityColor = (severity) => {
    if (!severity) return 'default';
    if (severity >= 16) return 'error';
    if (severity >= 11) return 'warning';
    return 'info';
  };

  // Ensure we have valid samples
  const validSamples = {
    success: samples?.success || {
      status: "success",
      message: "Sample success response"
    },
    error: samples?.error || {
      status: "error",
      errorCode: 50000,
      message: "Sample error response",
      details: {
        procedure: metadata?.procedureName || "Unknown",
        severity: 16,
        state: 1
      }
    }
  };

  return (
    <Box>
      <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ mb: 2 }}>
        <Tab 
          icon={<SuccessIcon color="success" />} 
          label="Success Response" 
          iconPosition="start"
        />
        <Tab 
          icon={<ErrorIcon color="error" />} 
          label="Error Response" 
          iconPosition="start"
        />
      </Tabs>

      {activeTab === 0 ? (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Alert severity="success" variant="outlined">
              Successful response for {metadata?.operationType || 'EXECUTE'} operation
            </Alert>
          </Box>
          <SyntaxHighlighter
            language="javascript"
            style={tomorrow}
            customStyle={{
              borderRadius: '4px',
              margin: 0
            }}
          >
            {JSON.stringify(validSamples.success, null, 2)}
          </SyntaxHighlighter>
        </Box>
      ) : (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Alert severity="error" variant="outlined">
              Error response with code: {validSamples.error.errorCode}
            </Alert>
          </Box>

          {metadata?.errorHandling?.hasErrorHandling && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Error Handling Details
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Error Code</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(metadata.errorHandling.errorCodes || []).map((code) => (
                    <TableRow key={code}>
                      <TableCell>
                        <Chip
                          label={code}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`Severity ${validSamples.error.details?.severity || 16}`}
                          size="small"
                          color={getErrorSeverityColor(validSamples.error.details?.severity)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        Standard SQL Server error
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          <SyntaxHighlighter
            language="javascript"
            style={tomorrow}
            customStyle={{
              borderRadius: '4px',
              margin: 0
            }}
          >
            {JSON.stringify(validSamples.error, null, 2)}
          </SyntaxHighlighter>
        </Box>
      )}
    </Box>
  );
};

export default ResponseExamples; 