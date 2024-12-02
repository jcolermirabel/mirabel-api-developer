import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Button,
  Select,
  MenuItem,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  ListSubheader
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { createRole, updateRole } from '../../services/roleService';
import { getServices } from '../../services/serviceService';
import { getDatabaseObjects } from '../../services/roleService';

const STEPS = ['Basic Information', 'Service Access'];

const sortAndGroupComponents = (data) => {
  console.log('sortAndGroupComponents input:', data);
  
  if (!data) {
    console.log('No data provided, returning empty arrays');
    return { tables: [], views: [], procedures: [] };
  }
  
  // If data is already in the right format, return it
  if (data.tables && data.views && data.procedures) {
    console.log('Data already grouped, returning as is');
    return data;
  }

  // Otherwise, sort the raw SQL data
  const sortByName = (a, b) => a.name.localeCompare(b.name);

  const grouped = {
    tables: Array.isArray(data) ? data.filter(o => o.type === 'U').map(o => o.name).sort(sortByName) : [],
    views: Array.isArray(data) ? data.filter(o => o.type === 'V').map(o => o.name).sort(sortByName) : [],
    procedures: Array.isArray(data) ? data.filter(o => ['P', 'FN', 'IF', 'TF'].includes(o.type))
      .map(o => o.name).sort(sortByName) : []
  };

  console.log('Grouped components:', grouped);
  return grouped;
};

const CreateRole = ({ mode = 'create', existingRole = null }) => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [basicInfo, setBasicInfo] = useState({
    name: existingRole?.name || '',
    description: existingRole?.description || '',
    isActive: existingRole?.isActive ?? true
  });
  
  const [services, setServices] = useState([]);
  const [isLoadingComponents, setIsLoadingComponents] = useState(true);
  const [serviceComponents, setServiceComponents] = useState({});
  const [permissions, setPermissions] = useState(
    existingRole?.permissions 
      ? existingRole.permissions.map((p, index) => ({
          id: index + 1,
          service: p.service || '',
          component: p.objectName || '',
          objectType: p.objectType || '',
          actions: p.actions || {
            GET: false,
            POST: false,
            PUT: false,
            PATCH: false,
            DELETE: false
          },
          requester: p.requester || 'API'
        }))
      : [{
          id: 1,
          service: '',
          component: '',
          objectType: '',
          actions: {
            GET: false,
            POST: false,
            PUT: false,
            PATCH: false,
            DELETE: false
          },
          requester: 'API'
        }]
  );

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await getServices();
        setServices(data);
      } catch (err) {
        console.error('Error fetching services:', err);
        setError('Failed to fetch services');
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    const loadInitialComponents = async () => {
      if (mode === 'edit' && existingRole?.permissions?.length > 0) {
        try {
          setIsLoadingComponents(true);
          const uniqueServices = [...new Set(existingRole.permissions.map(p => p.service))];
          
          for (const serviceId of uniqueServices) {
            if (!serviceComponents[serviceId]) {
              const data = await getDatabaseObjects(serviceId);
              const sortedComponents = sortAndGroupComponents(data);
              setServiceComponents(prev => ({
                ...prev,
                [serviceId]: sortedComponents
              }));
            }
          }
        } catch (err) {
          console.error('Error fetching initial components:', err);
          setError('Failed to fetch components');
        } finally {
          setIsLoadingComponents(false);
        }
      }
    };
    
    loadInitialComponents();
  }, [mode, existingRole, serviceComponents]);

  const handleNext = () => {
    if (activeStep === STEPS.length - 1) {
      handleSubmit();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleAddPermission = () => {
    setPermissions(prev => [...prev, {
      id: Date.now(), // Use timestamp as unique ID
      service: '',
      component: '',
      objectType: '',
      actions: {
        GET: false,
        POST: false,
        PUT: false,
        PATCH: false,
        DELETE: false
      },
      requester: 'API'
    }]);
  };

  const handleRemovePermission = (id) => {
    setPermissions(prev => prev.filter(p => p.id !== id));
  };

  const handlePermissionChange = async (id, field, value) => {
    if (field === 'service') {
      console.log('Selected service:', {
        id: value,
        field,
        permissionId: id
      });
      if (!serviceComponents[value]) {
        try {
          setIsLoadingComponents(true);
          const data = await getDatabaseObjects(value);
          console.log('Received database objects:', data);
          const sortedComponents = sortAndGroupComponents(data);
          console.log('Sorted components:', sortedComponents);
          setServiceComponents(prev => ({
            ...prev,
            [value]: sortedComponents
          }));
        } catch (err) {
          console.error('Error fetching components:', err);
          setError('Failed to fetch components');
        } finally {
          setIsLoadingComponents(false);
        }
      }
    }
    
    setPermissions(prev => {
      const updated = prev.map(p => {
        if (p.id === id) {
          if (field === 'service') {
            return { ...p, [field]: value, component: '' };
          }
          return { ...p, [field]: value };
        }
        return p;
      });
      return updated;
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const roleData = {
        name: basicInfo.name,
        description: basicInfo.description || '',
        isActive: basicInfo.isActive,
        permissions: permissions.map(p => {
          const componentType = serviceComponents[p.service]?.find(c => c.name === p.component)?.type || 'procedures';
          return {
            service: p.service,
            objectName: p.component,
            objectType: componentType,
            actions: p.actions,
            requester: p.requester
          };
        })
      };
      
      if (mode === 'edit' && existingRole?._id) {
        await updateRole(existingRole._id, roleData);
        setError(''); // Clear any existing errors
      } else {
        await createRole(roleData);
        navigate('/roles'); // Only navigate away if creating a new role
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || `Failed to ${mode} role`);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ p: 3 }}>
            <TextField
              fullWidth
              label="Role Name"
              value={basicInfo.name}
              onChange={(e) => setBasicInfo(prev => ({ ...prev, name: e.target.value }))}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={basicInfo.description}
              onChange={(e) => setBasicInfo(prev => ({ ...prev, description: e.target.value }))}
              margin="normal"
              multiline
              rows={3}
            />
          </Box>
        );
      
      case 1:
        return (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddPermission}
                variant="contained"
                color="primary"
              >
              </Button>
            </Box>

            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width="20%">Service</TableCell>
                  <TableCell width="35%">Component</TableCell>
                  <TableCell width="20%">Access</TableCell>
                  <TableCell width="15%">Requester</TableCell>
                  <TableCell width="10%"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {permissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell>
                      <Select
                        fullWidth
                        value={permission.service || ''}
                        onChange={(e) => handlePermissionChange(permission.id, 'service', e.target.value)}
                        size="small"
                      >
                        <MenuItem value="">Select a service</MenuItem>
                        {services.map((service) => (
                          <MenuItem key={service._id} value={service._id}>
                            {service.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        fullWidth
                        value={permission.component || ''}
                        onChange={(e) => handlePermissionChange(permission.id, 'component', e.target.value)}
                        disabled={!permission.service || isLoadingComponents}
                        size="small"
                      >
                        <MenuItem value="">Select a component</MenuItem>
                        {permission.component && (
                          <MenuItem value={permission.component}>
                            {permission.component}
                          </MenuItem>
                        )}
                        {permission.service && serviceComponents[permission.service] && !isLoadingComponents && [
                          <ListSubheader key="proc-header">Stored Procedures</ListSubheader>,
                          ...serviceComponents[permission.service]
                            .filter(c => c.type === 'procedures')
                            .map(component => (
                              <MenuItem key={component.name} value={component.name}>
                                {component.name}
                              </MenuItem>
                            )),
                          <ListSubheader key="tables-header">Tables</ListSubheader>,
                          ...serviceComponents[permission.service]
                            .filter(c => c.type === 'tables')
                            .map(component => (
                              <MenuItem key={component.name} value={component.name}>
                                {component.name}
                              </MenuItem>
                            )),
                          <ListSubheader key="views-header">Views</ListSubheader>,
                          ...serviceComponents[permission.service]
                            .filter(c => c.type === 'views')
                            .map(component => (
                              <MenuItem key={component.name} value={component.name}>
                                {component.name}
                              </MenuItem>
                            ))
                        ]}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        fullWidth
                        multiple
                        value={Object.entries(permission.actions)
                          .filter(([, value]) => value)
                          .map(([key]) => key)}
                        onChange={(e) => {
                          const selectedActions = e.target.value;
                          setPermissions(prev => prev.map(p => {
                            if (p.id === permission.id) {
                              return {
                                ...p,
                                actions: {
                                  GET: selectedActions.includes('GET'),
                                  POST: selectedActions.includes('POST'),
                                  PUT: selectedActions.includes('PUT'),
                                  PATCH: selectedActions.includes('PATCH'),
                                  DELETE: selectedActions.includes('DELETE')
                                }
                              };
                            }
                            return p;
                          }));
                        }}
                        size="small"
                      >
                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        fullWidth
                        value={permission.requester || 'API'}
                        onChange={(e) => handlePermissionChange(permission.id, 'requester', e.target.value)}
                        size="small"
                      >
                        <MenuItem value="API">API</MenuItem>
                        <MenuItem value="UI">UI</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleRemovePermission(permission.id)}
                        disabled={permissions.length === 1}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      <h2>{mode === 'edit' ? 'Edit Role' : 'Create New Role'}</h2>
      
      {error && (
        <Alert severity="error" sx={{ mx: 2, mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ py: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {renderStepContent()}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
        <Button
          onClick={() => navigate('/roles')}
          sx={{ mr: 1 }}
        >
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            Back
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={loading || 
            (activeStep === 0 && !basicInfo.name) ||
            (activeStep === 1 && permissions.some(p => !p.service || !p.component))
          }
        >
          {activeStep === STEPS.length - 1 
            ? (mode === 'edit' ? 'Update Role' : 'Create Role') 
            : 'Next'}
        </Button>
      </Box>
    </Box>
  );
};

export default CreateRole; 