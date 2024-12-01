import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { getRoles, deleteRole, updateRole } from '../../services/roleService';
import LoadingSpinner from '../common/LoadingSpinner';
import ConfirmDialog from '../common/ConfirmDialog';
import ExportMenu from '../common/ExportMenu';
import { useSelection } from '../../context/SelectionContext';
import BulkActions from '../common/BulkActions';
import Switch from '@mui/material/Switch';

const RoleList = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, roleId: null });
  const { selectedItems, toggleSelection } = useSelection();

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await getRoles();
      setRoles(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch roles');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    fetchRoles();
    return () => abortController.abort();
  }, []);

  const handleDelete = async (roleId) => {
    try {
      await deleteRole(roleId);
      await fetchRoles();
    } catch (err) {
      setError('Failed to delete role');
    }
    setConfirmDelete({ open: false, roleId: null });
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        Array.from(selectedItems).map(id => deleteRole(id))
      );
      await fetchRoles();
    } catch (err) {
      setError('Failed to delete selected roles');
    }
  };

  const handleBulkEnable = async () => {
    try {
      await Promise.all(
        Array.from(selectedItems).map(id => 
          updateRole(id, { isActive: true })
        )
      );
      await fetchRoles();
    } catch (err) {
      setError('Failed to enable selected roles');
    }
  };

  const handleBulkDisable = async () => {
    try {
      await Promise.all(
        Array.from(selectedItems).map(id => 
          updateRole(id, { isActive: false })
        )
      );
      await fetchRoles();
    } catch (err) {
      setError('Failed to disable selected roles');
    }
  };

  const prepareExportData = () => {
    return roles.map(role => ({
      Name: role.name,
      Description: role.description,
      Status: role.isActive ? 'Active' : 'Inactive',
      CreatedAt: new Date(role.createdAt).toLocaleString()
    }));
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const allIds = roles.map(role => role._id);
      allIds.forEach(id => toggleSelection(id));
    } else {
      selectedItems.forEach(id => toggleSelection(id));
    }
  };

  const handleToggleActive = async (role) => {
    try {
      await updateRole(role._id, { ...role, isActive: !role.isActive });
      setRoles(roles.map(r => 
        r._id === role._id 
          ? { ...r, isActive: !r.isActive }
          : r
      ));
    } catch (err) {
      setError('Failed to update role status');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box 
      component="main" 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
        p: 1
      }}
      role="main"
      tabIndex="-1"
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 1
      }}>
        <Typography variant="h4">Roles</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ExportMenu 
            data={prepareExportData()}
            filename="roles-list"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/roles/create')}
          >
            Add Role
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', width: '100%' }}>
        <Table stickyHeader size="small" sx={{ width: '100%' }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ backgroundColor: '#1e2a3b', borderBottom: 'none' }}>
                <Checkbox
                  checked={selectedItems.size > 0 && selectedItems.size === roles.length}
                  indeterminate={selectedItems.size > 0 && selectedItems.size < roles.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none' }}>Name</TableCell>
              <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none' }}>Description</TableCell>
              <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none' }}>Active</TableCell>
              <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none', width: '100px' }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role._id}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedItems.has(role._id)}
                    onChange={() => toggleSelection(role._id)}
                  />
                </TableCell>
                <TableCell>{role.name}</TableCell>
                <TableCell>{role.description}</TableCell>
                <TableCell>
                  <Switch
                    checked={role.isActive}
                    onChange={() => handleToggleActive(role)}
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex' }}>
                    <IconButton size="small" onClick={() => navigate(`/roles/edit/${role._id}`)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      size="small"
                      onClick={() => setConfirmDelete({ open: true, roleId: role._id })}
                      color="error"
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

      <BulkActions
        selectedCount={selectedItems.size}
        onDelete={handleBulkDelete}
        onEnable={handleBulkEnable}
        onDisable={handleBulkDisable}
      />

      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete Role"
        message="Are you sure you want to delete this role? This action cannot be undone."
        onConfirm={() => handleDelete(confirmDelete.roleId)}
        onCancel={() => setConfirmDelete({ open: false, roleId: null })}
      />
    </Box>
  );
};

export default RoleList; 