import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';

const AdminSettings = () => {
  const [users, setUsers] = useState([]);
  const { getAllUsers, updateUserRole } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      const usersData = await getAllUsers();
      setUsers(usersData);
    };
    fetchUsers();
  }, [getAllUsers]);

  const handleRoleChange = async (userId, isAdmin) => {
    try {
      await updateUserRole(userId, isAdmin);
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isAdmin } : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Admin Settings
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Admin Access</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={user.isAdmin}
                          onChange={(e) => handleRoleChange(user.id, e.target.checked)}
                        />
                      }
                      label={user.isAdmin ? 'Admin' : 'User'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default AdminSettings; 