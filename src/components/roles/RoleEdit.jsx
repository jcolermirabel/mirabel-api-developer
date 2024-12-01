import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CircularProgress, Alert, Button } from '@mui/material';
import { getRoleById } from '../../services/roleService';
import CreateRole from './CreateRole';

export function RoleEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const data = await getRoleById(id);
        setRole(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, [id]);

  if (loading) return <CircularProgress />;
  if (error) return (
    <div>
      <Alert severity="error">{error}</Alert>
      <Button 
        variant="contained" 
        onClick={() => navigate('/roles')}
        sx={{ mt: 2 }}
      >
        Back to Roles
      </Button>
    </div>
  );
  if (!role) return <Alert severity="error">Role not found</Alert>;

  return <CreateRole mode="edit" existingRole={role} />;
}

export default RoleEdit; 