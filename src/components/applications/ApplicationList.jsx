import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Dialog,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { getApplications, deleteApplication, regenerateApiKey, updateApplication } from '../../services/applicationService';
import ApplicationForm from './ApplicationForm';
import LoadingSpinner from '../common/LoadingSpinner';
import ConfirmDialog from '../common/ConfirmDialog';
import { useNotification } from '../../context/NotificationContext';
import ExportMenu from '../common/ExportMenu';
import { useSelection } from '../../context/SelectionContext';
import Switch from '@mui/material/Switch';

const ApplicationList = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [editApplication, setEditApplication] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, applicationId: null });
  const { showNotification } = useNotification();
  const { selectedItems, toggleSelection } = useSelection();

  const fetchApplications = async () => {
    try {
      const data = await getApplications();
      setApplications(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleDelete = async (applicationId) => {
    try {
      await deleteApplication(applicationId);
      await fetchApplications();
      showNotification('Application deleted successfully', 'success');
    } catch (err) {
      setError('Failed to delete application');
    }
    setConfirmDelete({ open: false, applicationId: null });
  };

  const handleCopyApiKey = (apiKey) => {
    navigator.clipboard.writeText(apiKey);
    showNotification('API key copied to clipboard', 'success');
  };

  const handleRegenerateApiKey = async (applicationId) => {
    try {
      await regenerateApiKey(applicationId);
      await fetchApplications();
      showNotification('API key regenerated successfully', 'success');
    } catch (err) {
      setError('Failed to regenerate API key');
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const allIds = applications.map(app => app._id);
      allIds.forEach(id => toggleSelection(id));
    } else {
      selectedItems.forEach(id => toggleSelection(id));
    }
  };

  const handleToggleActive = async (application) => {
    try {
      await updateApplication(application._id, { ...application, isActive: !application.isActive });
      await fetchApplications();
    } catch (err) {
      setError('Failed to update application status');
    }
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
        mb: 1
      }}>
        <Typography variant="h4">Applications</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ExportMenu 
            data={applications.map(app => ({
              Name: app.name,
              Description: app.description,
              DefaultRole: app.defaultRole?.name,
              Status: app.isActive ? 'Active' : 'Inactive',
              CreatedAt: new Date(app.createdAt).toLocaleString()
            }))}
            filename="applications-list"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditApplication(null);
              setOpenForm(true);
            }}
          >
            Add Application
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
                  checked={selectedItems.size > 0 && selectedItems.size === applications.length}
                  indeterminate={selectedItems.size > 0 && selectedItems.size < applications.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: '#1e2a3b',
                  color: 'white',
                  borderBottom: 'none'
                }}
              >
                Name
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: '#1e2a3b',
                  color: 'white',
                  borderBottom: 'none'
                }}
              >
                Description
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: '#1e2a3b',
                  color: 'white',
                  borderBottom: 'none'
                }}
              >
                Default Role
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: '#1e2a3b',
                  color: 'white',
                  borderBottom: 'none'
                }}
              >
                API Key
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: '#1e2a3b',
                  color: 'white',
                  borderBottom: 'none'
                }}
              >
                Active
              </TableCell>
              <TableCell 
                sx={{ 
                  backgroundColor: '#1e2a3b',
                  color: 'white',
                  width: '100px',
                  borderBottom: 'none'
                }}
              >
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {applications.map((app) => (
              <TableRow 
                key={app._id}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedItems.has(app._id)}
                    onChange={() => toggleSelection(app._id)}
                  />
                </TableCell>
                <TableCell>{app.name}</TableCell>
                <TableCell>{app.description}</TableCell>
                <TableCell>{app.defaultRole?.name}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {app.apiKey}
                    </Typography>
                    <IconButton size="small" onClick={() => handleCopyApiKey(app.apiKey)}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleRegenerateApiKey(app._id)}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={app.isActive}
                    onChange={() => handleToggleActive(app)} 
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex' }}>
                    <IconButton size="small" onClick={() => {
                      setEditApplication(app);
                      setOpenForm(true);
                    }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setConfirmDelete({ open: true, applicationId: app._id })}
                    >
                      <DeleteIcon />
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
          setEditApplication(null);
        }}
        maxWidth="sm"
        fullWidth
        aria-labelledby="application-form-dialog"
        disablePortal={false}
        keepMounted={false}
        disableEnforceFocus
      >
        <ApplicationForm
          application={editApplication}
          onSubmitted={() => {
            setOpenForm(false);
            setEditApplication(null);
            fetchApplications();
          }}
          onCancel={() => {
            setOpenForm(false);
            setEditApplication(null);
          }}
        />
      </Dialog>

      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete Application"
        message="Are you sure you want to delete this application? This action cannot be undone."
        onConfirm={() => handleDelete(confirmDelete.applicationId)}
        onCancel={() => setConfirmDelete({ open: false, applicationId: null })}
        disablePortal={false}
        keepMounted={false}
        disableEnforceFocus
      />
    </Box>
  );
};

export default ApplicationList; 