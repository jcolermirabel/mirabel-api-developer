import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Checkbox,
  FormControlLabel,
  Switch
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { createRole, updateRole, getServiceSchema } from '../../services/roleService';
import { getServices } from '../../services/serviceService';

const steps = ['Basic Information', 'Component Permissions'];

const CreateRole = ({ mode = 'create', existingRole = null }) => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [role, setRole] = useState({
    name: '',
    description: '',
    serviceId: '',
    permissions: [],
    isActive: true
  });
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [components, setComponents] = useState({
    tables: [],
    views: [],
    procedures: []
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newComponent, setNewComponent] = useState({
    serviceId: '',
    objectName: '',
    actions: {
      GET: false,
      POST: false,
      PUT: false,
      DELETE: false
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleItems, setVisibleItems] = useState(50);
  const [sortedComponents, setSortedComponents] = useState([]);

  useEffect(() => {
    if (existingRole) {
      console.log('Setting existing role:', existingRole);
      setRole({
        name: existingRole.name,
        description: existingRole.description,
        serviceId: existingRole.serviceId,
        permissions: existingRole.permissions || [],
        isActive: existingRole.isActive ?? true
      });
      setSelectedService(existingRole.serviceId);
      if (existingRole.serviceId) {
        fetchServiceComponents(existingRole.serviceId);
      }
    }
    fetchServices();
  }, [existingRole]);

  useEffect(() => {
    const sorted = [
      ...components.procedures.map(p => ({
        ...p,
        type: 'Procedure',
        uniqueId: `proc-${p.name}`,
        path: `/proc/${p.name}`
      })),
      ...components.tables.map(t => ({
        ...t,
        type: 'Table',
        uniqueId: `table-${t.name}`,
        path: `/table/${t.name}`
      })),
      ...components.views.map(v => ({
        ...v,
        type: 'View',
        uniqueId: `view-${v.name}`,
        path: `/view/${v.name}`
      }))
    ];
    console.log('Sorted components:', sorted);
    setSortedComponents(sorted);
  }, [components]);

  const fetchServices = async () => {
    try {
      const data = await getServices();
      setServices(data);
    } catch (err) {
      setError('Failed to fetch services');
    }
  };

  const fetchServiceComponents = async (serviceId) => {
    try {
      setLoading(true);
      console.log('Fetching components for service:', serviceId);
      const schema = await getServiceSchema(serviceId);
      console.log('Received schema:', schema);
      
      setComponents({
        tables: schema.tables || [],
        views: schema.views || [],
        procedures: schema.procedures || []
      });
    } catch (err) {
      console.error('Error fetching components:', err);
      setError('Failed to fetch service components');
      setComponents({ tables: [], views: [], procedures: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (activeStep === 0 && !role.name) {
      setError('Please enter a role name');
      return;
    }
    
    if (mode === 'edit' && activeStep === 0) {
      try {
        console.log('Current role state before update:', role);
        console.log('Existing role:', existingRole);
        
        // Only update if there are changes
        if (role.name !== existingRole.name || role.description !== existingRole.description) {
          const updatedRole = {
            ...existingRole,
            name: role.name,
            description: role.description,
            serviceId: existingRole.serviceId,
            permissions: existingRole.permissions,
            isActive: role.isActive
          };
          
          console.log('Sending role update:', updatedRole);
          const result = await updateRole(existingRole._id, updatedRole);
          console.log('Role update response:', result);
          
          // Update local state with server response
          setRole(prev => ({
            ...prev,
            ...result
          }));
        }
      } catch (err) {
        console.error('Error updating role:', err);
        setError('Failed to update role');
        return;
      }
    }
    
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      if (!role.name) {
        setError('Role name is required');
        return;
      }

      const roleData = {
        name: role.name,
        description: role.description,
        serviceId: selectedService || role.serviceId,
        permissions: role.permissions || [],
        isActive: role.isActive
      };

      console.log('Submitting role with data:', roleData);

      if (!roleData.serviceId) {
        setError('Service ID is required');
        return;
      }

      if (!roleData.permissions || roleData.permissions.length === 0) {
        console.error('No permissions found:', roleData);
        setError('At least one component permission is required');
        return;
      }

      if (mode === 'edit') {
        await updateRole(existingRole._id, roleData);
      } else {
        await createRole(roleData);
      }
      
      console.log('Role saved successfully');
      navigate('/roles');
    } catch (err) {
      console.error('Role save error:', err);
      setError(err.response?.data?.message || 'Failed to save role');
    }
  };

  const handleServiceChange = async (event) => {
    const serviceId = event.target.value;
    setSelectedService(serviceId);
    setNewComponent(prev => ({ ...prev, serviceId }));
    setRole(prev => ({
      ...prev,
      serviceId: serviceId
    }));
    await fetchServiceComponents(serviceId);
  };

  const handleComponentSelect = (selectedValue) => {
    console.log('Component selected:', {
      selectedValue,
      currentComponent: newComponent.objectName,
      isSearch: selectedValue === 'search'
    });

    if (selectedValue && selectedValue !== 'search') {
      const selectedComponent = sortedComponents.find(c => c.path === selectedValue);
      console.log('Found component:', selectedComponent);

      // Strip out schema prefix if present
      const cleanedPath = selectedValue.replace(/\/proc\/[^.]+\./, '/proc/');

      setNewComponent(prev => {
        const updated = {
          ...prev,
          objectName: cleanedPath,
          originalPath: selectedValue  // Store the original path for display
        };
        console.log('Updated component state:', updated);
        return updated;
      });
    }
  };

  const handleAddComponent = () => {
    console.log('Attempting to add component:', {
      newComponent,
      serviceSelected: !!newComponent.serviceId,
      componentSelected: !!newComponent.objectName,
      currentPermissions: role.permissions,
      selectedMethods: Object.entries(newComponent.actions)
        .filter(([, enabled]) => enabled)
        .map(([method]) => method)
    });

    // Validate service selection
    if (!newComponent.serviceId) {
      setError('Please select a service');
      return;
    }

    // Validate component selection
    if (!newComponent.objectName) {
      setError('Please select a component');
      return;
    }

    // Validate method selection
    const hasActions = Object.values(newComponent.actions).some(v => v);
    if (!hasActions) {
      setError('Please select at least one method');
      return;
    }

    console.log('All validations passed, adding component');

    // Create the new permission object
    const newPermission = {
      serviceId: newComponent.serviceId,
      objectName: newComponent.objectName,
      actions: { ...newComponent.actions }
    };

    console.log('New permission to add:', newPermission);

    setRole(prev => {
      const updated = {
        ...prev,
        permissions: [...(prev.permissions || []), newPermission]
      };
      console.log('Updated role with new permissions:', updated);
      return updated;
    });

    // Reset component selection but keep the service
    setNewComponent({
      serviceId: selectedService,
      objectName: '',
      actions: {
        GET: false,
        POST: false,
        PUT: false,
        DELETE: false
      }
    });

    setError(''); // Clear any existing errors
  };

  const handleDeleteComponent = (index) => {
    setRole(prev => ({
      ...prev,
      permissions: prev.permissions.filter((_, i) => i !== index)
    }));
  };

  const handleMenuScroll = (event) => {
    const { scrollTop, clientHeight, scrollHeight } = event.target;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      setVisibleItems(prev => prev + 50);
    }
  };

  const handleCancel = () => {
    navigate('/roles');
  };

  const renderBasicInfo = () => (
    <Box sx={{ p: 2 }}>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <TextField
          label="Role Name"
          value={role.name || ''}
          onChange={(e) => {
            const newName = e.target.value;
            console.log('Updating role name from:', role.name, 'to:', newName);
            setRole(prev => ({
              ...prev,
              name: newName
            }));
          }}
          required
        />
      </FormControl>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <TextField
          label="Description"
          value={role.description || ''}
          onChange={(e) => {
            const newDescription = e.target.value;
            console.log('Updating role description from:', role.description, 'to:', newDescription);
            setRole(prev => ({
              ...prev,
              description: newDescription
            }));
          }}
          multiline
          rows={3}
        />
      </FormControl>
      <FormControl>
        <FormControlLabel
          control={
            <Switch
              checked={role.isActive}
              onChange={(e) => setRole({ ...role, isActive: e.target.checked })}
            />
          }
          label="Active"
        />
      </FormControl>
    </Box>
  );

  const renderComponentPermissions = () => (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Add Component</Typography>
          <IconButton 
            color="primary" 
            onClick={handleAddComponent}
          >
            <AddIcon />
          </IconButton>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Service</InputLabel>
            <Select
              value={newComponent.serviceId}
              onChange={handleServiceChange}
              label="Service"
            >
              {services.map((service) => (
                <MenuItem key={service._id} value={service._id}>
                  {service.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Component</InputLabel>
            <Select
              value={newComponent.originalPath || ''}
              onChange={(e) => handleComponentSelect(e.target.value)}
              label="Component"
              disabled={!newComponent.serviceId || loading}
              MenuProps={{
                PaperProps: {
                  onScroll: handleMenuScroll,
                  style: { maxHeight: 300 }
                }
              }}
            >
              {loading ? (
                <MenuItem disabled>Loading components...</MenuItem>
              ) : [
                <MenuItem key="search-field" value="search">
                  <TextField
                    size="small"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => {
                      e.stopPropagation();
                      setSearchTerm(e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </MenuItem>,
                ...sortedComponents
                  .filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .slice(0, visibleItems)
                  .map((obj) => {
                    console.log('Rendering menu item:', obj);
                    if (!obj.name) {
                      console.warn('Invalid component object:', obj);
                      return null;
                    }
                    return (
                      <MenuItem key={obj.uniqueId} value={obj.path}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography>{obj.name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {obj.type}
                          </Typography>
                        </Box>
                      </MenuItem>
                    );
                  })
                  .filter(Boolean)
              ]}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Methods</InputLabel>
            <Select
              multiple
              value={Object.entries(newComponent.actions)
                .filter(([, enabled]) => enabled)
                .map(([method]) => method)}
              onChange={(e) => {
                const selectedMethods = e.target.value;
                console.log('Methods selected:', selectedMethods);
                setNewComponent(prev => {
                  const updated = {
                    ...prev,
                    actions: {
                      GET: selectedMethods.includes('GET'),
                      POST: selectedMethods.includes('POST'),
                      PUT: selectedMethods.includes('PUT'),
                      DELETE: selectedMethods.includes('DELETE')
                    }
                  };
                  console.log('Updated component with methods:', updated);
                  return updated;
                });
              }}
              label="Methods"
              renderValue={(selected) => selected.join(', ')}
            >
              {['GET', 'POST', 'PUT', 'DELETE'].map((method) => (
                <MenuItem key={method} value={method}>
                  <Checkbox checked={newComponent.actions[method]} />
                  <Typography>{method}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Service</TableCell>
              <TableCell>Component</TableCell>
              <TableCell>Actions</TableCell>
              <TableCell>Delete</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {role.permissions.map((permission, index) => (
              <TableRow key={`${permission.serviceId}-${permission.objectName}`}>
                <TableCell>
                  {services.find(s => s._id === permission.serviceId)?.name}
                </TableCell>
                <TableCell>{permission.objectName}</TableCell>
                <TableCell>
                  {Object.entries(permission.actions)
                    .filter(([, enabled]) => enabled)
                    .map(([method]) => method)
                    .join(', ')}
                </TableCell>
                <TableCell>
                  <IconButton 
                    color="error" 
                    onClick={() => handleDeleteComponent(index)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <Box sx={{ width: '100%' }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 ? renderBasicInfo() : renderComponentPermissions()}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
        <Button onClick={handleCancel}>
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button onClick={handleBack}>
            Back
          </Button>
        )}
        {activeStep === steps.length - 1 ? (
          <Button variant="contained" onClick={handleSubmit}>
            {mode === 'edit' ? 'Update' : 'Create'} Role
          </Button>
        ) : (
          <Button variant="contained" onClick={handleNext}>
            Next
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default CreateRole; 