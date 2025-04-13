import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Dialog,
  Chip,
  Checkbox,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { deleteUser, updateUser } from '../../services/userService';
import UserForm from './UserForm';
import LoadingSpinner from '../common/LoadingSpinner';
import ConfirmDialog from '../common/ConfirmDialog';
import ExportMenu from '../common/ExportMenu';
import { useSelection } from '../../context/SelectionContext';
import BulkActions from '../common/BulkActions';
import { getUsers } from '../../services/userService';
import { useNotification } from '../../context/NotificationContext';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, userId: null });
  const { selectedItems, toggleSelection } = useSelection();
  const { showNotification } = useNotification();

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
      setError('');
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (userId) => {
    try {
      await deleteUser(userId);
      setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
      showNotification('User deleted successfully', 'success');
    } catch (err) {
      setError('Failed to delete user');
    }
    setConfirmDelete({ open: false, userId: null });
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const allIds = users.map(user => user._id);
      allIds.forEach(id => toggleSelection(id));
    } else {
      selectedItems.forEach(id => toggleSelection(id));
    }
  };

  const handleEdit = (user) => {
    setEditUser(user);
    setOpenForm(true);
  };

  const prepareExportData = () => {
    return users.map(user => ({
      FirstName: user.firstName || (user.name ? user.name.split(' ')[0] : ''),
      LastName: user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : ''),
      Email: user.email,
      Role: user.isAdmin ? 'Administrator' : 'User',
      CreatedAt: new Date(user.createdAt || user.created).toLocaleString(),
      LastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never',
      Status: user.isActive ? 'Active' : 'Inactive'
    }));
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        Array.from(selectedItems).map(id => deleteUser(id))
      );
      setUsers(prevUsers => prevUsers.filter(user => !selectedItems.has(user._id)));
      showNotification('Selected users deleted successfully', 'success');
    } catch (err) {
      setError('Failed to delete selected users');
    }
  };

  const handleBulkEnable = async () => {
    try {
      await Promise.all(
        Array.from(selectedItems).map(id => 
          updateUser(id, { isActive: true })
        )
      );
      await fetchUsers();
    } catch (err) {
      setError('Failed to enable selected users');
    }
  };

  const handleBulkDisable = async () => {
    try {
      await Promise.all(
        Array.from(selectedItems).map(id => 
          updateUser(id, { isActive: false })
        )
      );
      await fetchUsers();
    } catch (err) {
      setError('Failed to disable selected users');
    }
  };

  const handleActiveToggle = async (id, currentActive) => {
    try {
      await updateUser(id, { isActive: !currentActive });
      fetchUsers();
    } catch (error) {
      setError('Error toggling user status');
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
        <Typography variant="h4">Users</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ExportMenu 
            data={prepareExportData()}
            filename="users-list"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditUser(null);
              setOpenForm(true);
            }}
          >
            Add User
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', width: '100%' }}>
        <Table stickyHeader size="small" sx={{ width: '100%' }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ backgroundColor: '#1e2a3b', borderBottom: 'none' }}>
                <Checkbox
                  checked={selectedItems.size > 0 && selectedItems.size === users.length}
                  indeterminate={selectedItems.size > 0 && selectedItems.size < users.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none' }}>Name</TableCell>
              <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none' }}>Email</TableCell>
              <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none' }}>Role</TableCell>
              <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none' }}>Active</TableCell>
              <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none' }}>Last Login</TableCell>
              <TableCell sx={{ backgroundColor: '#1e2a3b', color: 'white', borderBottom: 'none', width: '120px' }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(users) && users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedItems.has(user._id)}
                      onChange={() => toggleSelection(user._id)}
                    />
                  </TableCell>
                  <TableCell>{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.isAdmin && (
                      <Chip
                        label="Admin"
                        color="primary"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.isActive}
                      onChange={() => handleActiveToggle(user._id, user.isActive)}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex' }}>
                      <IconButton size="small" onClick={() => handleEdit(user)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small"
                        onClick={() => setConfirmDelete({ open: true, userId: user._id })}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No users found. Create your first user with the "Add User" button.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      <BulkActions
        selectedCount={selectedItems.size}
        onDelete={handleBulkDelete}
        onEnable={handleBulkEnable}
        onDisable={handleBulkDisable}
      />

      <Dialog
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setEditUser(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <UserForm
          user={editUser}
          onUserSubmitted={() => {
            setOpenForm(false);
            setEditUser(null);
            fetchUsers();
          }}
        />
      </Dialog>

      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        onConfirm={() => handleDelete(confirmDelete.userId)}
        onCancel={() => setConfirmDelete({ open: false, userId: null })}
      />
    </Box>
  );
};

export default UserList; 