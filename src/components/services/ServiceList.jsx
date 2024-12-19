import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Dialog,
  Alert,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { getServices, deleteService, updateService, refreshServiceSchema } from '../../services/serviceService';
import ServiceForm from './ServiceForm';
import LoadingSpinner from '../common/LoadingSpinner';
import ConfirmDialog from '../common/ConfirmDialog';
import ExportMenu from '../common/ExportMenu';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import { useSelection } from '../../context/SelectionContext';

const ServiceList = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [editService, setEditService] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, serviceId: null });
  const navigate = useNavigate();
  const { selectedItems, toggleSelection } = useSelection();

  const fetchServices = async () => {
    try {
      const data = await getServices();
      setServices(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleDelete = async (serviceId) => {
    try {
      await deleteService(serviceId);
      await fetchServices();
    } catch (err) {
      setError('Failed to delete service');
    }
    setConfirmDelete({ open: false, serviceId: null });
  };

  const handleEdit = (service) => {
    setEditService(service);
    setOpenForm(true);
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const allIds = services.map(service => service._id);
      allIds.forEach(id => toggleSelection(id));
    } else {
      selectedItems.forEach(id => toggleSelection(id));
    }
  };

  const handleToggleActive = async (service) => {
    try {
      await updateService(service._id, { isActive: !service.isActive });
      await fetchServices();
    } catch (err) {
      setError('Failed to update service status');
    }
  };

  const handleRefreshSchema = async (serviceId) => {
    try {
      console.log('Refreshing schema for service:', serviceId);
      const result = await refreshServiceSchema(serviceId);
      setError('');
      setSuccess(`Schema refreshed for ${result.service}: ${result.objectCount.total} objects found (${result.objectCount.tables} tables, ${result.objectCount.views} views, ${result.objectCount.procedures} procedures)`);
      
      setTimeout(() => {
        setSuccess('');
      }, 5000);
    } catch (err) {
      console.error('Schema refresh failed:', err);
      setSuccess('');
      if (err.response?.status === 401) {
        console.log('Authentication error, redirecting to login');
        navigate('/login');
      } else {
        setError('Failed to refresh service schema');
      }
    }
  };

  const prepareExportData = () => {
    return services.map(service => ({
      Name: service.name,
      Host: service.host,
      Port: service.port,
      Database: service.database,
      Username: service.username,
      Status: service.isActive ? 'Active' : 'Inactive',
      CreatedAt: new Date(service.createdAt).toLocaleString(),
      UpdatedAt: new Date(service.updatedAt).toLocaleString()
    }));
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
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 1 }}>{success}</Alert>}
      
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 1
      }}>
        <Typography variant="h4">Services</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ExportMenu 
            data={prepareExportData()}
            filename="services-list"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditService(null);
              setOpenForm(true);
            }}
          >
            Add Service
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
                padding="checkbox" 
                sx={{ 
                  backgroundColor: '#1e2a3b',
                  width: '48px',
                  borderBottom: 'none'
                }}
              >
                <Checkbox
                  checked={selectedItems.size > 0 && selectedItems.size === services.length}
                  indeterminate={selectedItems.size > 0 && selectedItems.size < services.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: '#1e2a3b',
                  color: 'white',
                  width: '15%',
                  borderBottom: 'none'
                }}
              >
                ID ▲
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: '#1e2a3b',
                  color: 'white',
                  width: '15%',
                  borderBottom: 'none'
                }}
              >
                Name
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: '#1e2a3b',
                  color: 'white',
                  width: '15%',
                  borderBottom: 'none'
                }}
              >
                Label
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: '#1e2a3b',
                  color: 'white',
                  width: '25%',
                  borderBottom: 'none'
                }}
              >
                Description
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: '#1e2a3b',
                  color: 'white',
                  width: '10%',
                  borderBottom: 'none'
                }}
              >
                Type
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: '#1e2a3b',
                  color: 'white',
                  width: '10%',
                  borderBottom: 'none'
                }}
              >
                Active
              </TableCell>
              <TableCell 
                padding="checkbox"
                sx={{ 
                  backgroundColor: '#1e2a3b',
                  width: '100px',
                  borderBottom: 'none'
                }}
              >
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {services.map((service) => (
              <TableRow 
                key={service._id}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedItems.has(service._id)}
                    onChange={() => toggleSelection(service._id)}
                  />
                </TableCell>
                <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {service._id}
                </TableCell>
                <TableCell>{service.name}</TableCell>
                <TableCell>{service.label}</TableCell>
                <TableCell>{service.description}</TableCell>
                <TableCell>{service.type}</TableCell>
                <TableCell>
                  <Switch
                    checked={service.isActive}
                    onChange={() => handleToggleActive(service)}
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex' }}>
                    <IconButton onClick={() => handleEdit(service)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => navigate(`/services/${service._id}/roles`)}>
                      <SecurityIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => setConfirmDelete({ open: true, serviceId: service._id })}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                    <IconButton onClick={() => handleRefreshSchema(service._id)}>
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Dialog
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setEditService(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <ServiceForm
          service={editService}
          onServiceSubmitted={() => {
            setOpenForm(false);
            setEditService(null);
            fetchServices();
          }}
          onCancel={() => {
            setOpenForm(false);
            setEditService(null);
          }}
          title={editService ? "Edit Service" : "Add New Service"}
        />
      </Dialog>

      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete Service"
        message="Are you sure you want to delete this service? This action cannot be undone."
        onConfirm={() => handleDelete(confirmDelete.serviceId)}
        onCancel={() => setConfirmDelete({ open: false, serviceId: null })}
      />
    </Box>
  );
};

export default ServiceList; 