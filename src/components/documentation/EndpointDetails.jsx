import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Input as InputIcon
} from '@mui/icons-material';
import SchemaControls from './SchemaControls';

const EndpointDetails = ({ endpoint, onSchemaUpdate }) => {
  const handleSchemaUpdate = (newSchema) => {
    if (onSchemaUpdate) {
      onSchemaUpdate(endpoint.path, newSchema);
    }
  };

  const getParameterTypeColor = (type = '') => {
    const paramType = type.toLowerCase();
    switch (paramType) {
      case 'int':
      case 'bigint':
      case 'smallint':
      case 'tinyint':
        return 'primary';
      case 'varchar':
      case 'nvarchar':
      case 'char':
      case 'text':
        return 'success';
      case 'datetime':
      case 'date':
        return 'warning';
      case 'bit':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (!endpoint) return null;

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {endpoint.path}
        </Typography>
        <SchemaControls 
          endpoint={endpoint} 
          onSchemaUpdate={handleSchemaUpdate}
        />
      </Box>
      
      <Chip 
        label={endpoint.method} 
        color="primary" 
        size="small" 
        sx={{ mb: 2 }}
      />

      <Typography variant="body2" color="text.secondary" gutterBottom>
        {endpoint.description}
      </Typography>

      {endpoint.parameters?.length > 0 && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InputIcon color="primary" />
              <Typography>Parameters</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Required</TableCell>
                  <TableCell>I/O</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {endpoint.parameters.map((param, index) => {
                  const uniqueKey = `${endpoint.path}-${param.name || ''}-${param.parameterId || ''}-${index}`;
                  
                  return (
                    <TableRow key={uniqueKey}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {param.name?.replace('@', '')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={param.type}
                          size="small"
                          color={getParameterTypeColor(param.type)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={param.isNullable ? 'Optional' : 'Required'}
                          size="small"
                          color={param.isNullable ? 'default' : 'error'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={param.isOutput ? 'Output' : 'Input'}
                          size="small"
                          color={param.isOutput ? 'secondary' : 'primary'}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </AccordionDetails>
        </Accordion>
      )}

      {endpoint.procedureInfo && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CodeIcon color="primary" />
              <Typography>Details</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" component="pre" sx={{ 
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}>
              {endpoint.procedureInfo.procedure_definition}
            </Typography>
          </AccordionDetails>
        </Accordion>
      )}

      {endpoint.metadata && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Schema: {endpoint.metadata.schema}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Created: {new Date(endpoint.metadata.created).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Modified: {new Date(endpoint.metadata.modified).toLocaleDateString()}
          </Typography>
        </Box>
      )}

      {endpoint.error && (
        <Typography color="error" sx={{ mt: 2 }}>
          Error: {endpoint.error}
        </Typography>
      )}
    </Box>
  );
};

export default EndpointDetails; 