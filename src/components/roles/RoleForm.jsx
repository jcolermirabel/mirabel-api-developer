import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  MenuItem
} from '@mui/material';
import { createRole, updateRole, getDatabaseObjects } from '../../services/roleService';
import { getServices } from '../../services/serviceService';

const RoleForm = ({ role, onRoleSubmitted, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    isActive: role?.isActive ?? true,
    service: role?.service || '',
    permissions: role?.permissions || []
  });
  
  const [services, setServices] = useState([]);
  const [databaseObjects, setDatabaseObjects] = useState({
    tables: [],
    views: [],
    procedures: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    
    const fetchServices = async () => {
      try {
        setLoading(true);
        const data = await getServices();
        if (isMounted) {
          setServices(data);
          setError('');
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch services');
          console.error('Error fetching services:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchServices();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCancel = () => {
    if (onClose) {
      onClose();
    }
  };

  // Fetch database objects when service is selected
  useEffect(() => {
    const fetchDatabaseObjects = async () => {
      if (!formData.service) return;
      
      setLoading(true);
      try {
        const objects = await getDatabaseObjects(formData.service);
        setDatabaseObjects(objects);
      } catch (err) {
        setError('Failed to fetch database objects');
      } finally {
        setLoading(false);
      }
    };

    if (activeStep === 1 && formData.service) {
      fetchDatabaseObjects();
    }
  }, [formData.service, activeStep]);

  const handleBasicInfoChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'isActive' ? checked : value
    }));
  };

  const handleServiceChange = (e) => {
    setFormData(prev => ({
      ...prev,
      service: e.target.value,
      permissions: [] // Reset permissions when service changes
    }));
  };

  const handlePermissionChange = (objectName, objectType, action) => {
    setFormData(prev => {
      const permissions = [...prev.permissions];
      const existingIndex = permissions.findIndex(p => 
        p.objectName === objectName && p.objectType === objectType
      );
      
      if (existingIndex >= 0) {
        permissions[existingIndex] = {
          ...permissions[existingIndex],
          actions: {
            ...permissions[existingIndex].actions,
            [action]: !permissions[existingIndex].actions[action]
          }
        };
      } else {
        permissions.push({
          objectName,
          objectType,
          actions: {
            GET: action === 'GET',
            POST: action === 'POST',
            PUT: action === 'PUT',
            PATCH: action === 'PATCH',
            DELETE: action === 'DELETE'
          }
        });
      }
      
      return { ...prev, permissions };
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const roleData = {
        name: formData.name,
        description: formData.description,
        isActive: formData.isActive,
        service: formData.service,
        permissions: formData.permissions
      };

      if (role) {
        await updateRole(role._id, roleData);
      } else {
        await createRole(roleData);
      }

      onRoleSubmitted();
    } catch (err) {
      setError(err.message || 'Failed to save role');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <TextField
              margin="dense"
              label="Role Name"
              name="name"
              fullWidth
              required
              value={formData.name}
              onChange={handleBasicInfoChange}
            />
            <TextField
              margin="dense"
              label="Description"
              name="description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={handleBasicInfoChange}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isActive}
                  onChange={handleBasicInfoChange}
                  name="isActive"
                />
              }
              label="Active"
              sx={{ mt: 1 }}
            />
          </Box>
        );
      case 1:
        return (
          <Box>
            <TextField
              select
              fullWidth
              label="Select Service"
              value={formData.service}
              onChange={handleServiceChange}
              margin="normal"
            >
              {services.map(service => (
                <MenuItem key={service._id} value={service._id}>
                  {service.name}
                </MenuItem>
              ))}
            </TextField>
            
            {loading ? (
              <CircularProgress />
            ) : (
              <Paper sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Object Name</TableCell>
                      <TableCell align="center">GET</TableCell>
                      <TableCell align="center">POST</TableCell>
                      <TableCell align="center">PUT</TableCell>
                      <TableCell align="center">PATCH</TableCell>
                      <TableCell align="center">DELETE</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(databaseObjects).map(([type, objects]) =>
                      objects.map(objectName => (
                        <TableRow key={`${type}-${objectName}`}>
                          <TableCell>{`${type}: ${objectName}`}</TableCell>
                          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(action => (
                            <TableCell key={action} align="center">
                              <Checkbox
                                checked={formData.permissions.find(p => 
                                  p.objectName === objectName && 
                                  p.objectType === type)?.actions[action] || false}
                                onChange={() => handlePermissionChange(objectName, type, action)}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <DialogTitle>{role ? 'Edit Role' : 'Add New Role'}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          <Step>
            <StepLabel>Basic Information</StepLabel>
          </Step>
          <Step>
            <StepLabel>Service & Permissions</StepLabel>
          </Step>
        </Stepper>

        {renderStep()}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>
          Cancel
        </Button>
        {activeStep > 0 && (
          <Button onClick={() => setActiveStep(prev => prev - 1)}>
            Back
          </Button>
        )}
        {activeStep === 0 ? (
          <Button 
            onClick={() => setActiveStep(prev => prev + 1)} 
            variant="contained"
            disabled={!formData.name}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.service}
          >
            {role ? 'Update Role' : 'Create Role'}
          </Button>
        )}
      </DialogActions>
    </Box>
  );
};

export default RoleForm; 