import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getRoleById } from '../../services/roleService';
import CreateRole from './CreateRole';
import LoadingSpinner from '../common/LoadingSpinner';
import Alert from '@mui/material/Alert';

const RoleEdit = () => {
  const { id } = useParams();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRole = async () => {
      try {
        setLoading(true);
        const data = await getRoleById(id);
        console.log('Fetched role data:', data);
        setRole(data);
      } catch (err) {
        console.error('Error fetching role:', err);
        setError('Failed to fetch role');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRole();
    }
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!role) return <Alert severity="error">Role not found</Alert>;

  return <CreateRole mode="edit" existingRole={role} />;
};

export default RoleEdit; 