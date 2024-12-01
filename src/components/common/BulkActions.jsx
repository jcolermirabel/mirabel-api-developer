import { Box, Button, ButtonGroup, Typography } from '@mui/material';
import {
  Delete as DeleteIcon,
  CheckCircle as EnableIcon,
  Cancel as DisableIcon
} from '@mui/icons-material';
import { useSelection } from '../../context/SelectionContext';

const BulkActions = ({ onDelete, onEnable, onDisable, selectedCount }) => {
  const { clearSelection } = useSelection();

  const handleAction = async (action) => {
    try {
      await action();
      clearSelection();
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: '240px',
        right: 0,
        bgcolor: 'background.paper',
        boxShadow: 3,
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1000,
        transform: selectedCount > 0 ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-in-out'
      }}
    >
      <Typography variant="subtitle1">
        {selectedCount} items selected
      </Typography>
      <ButtonGroup variant="contained">
        {onEnable && (
          <Button
            startIcon={<EnableIcon />}
            color="success"
            onClick={() => handleAction(onEnable)}
          >
            Enable
          </Button>
        )}
        {onDisable && (
          <Button
            startIcon={<DisableIcon />}
            color="warning"
            onClick={() => handleAction(onDisable)}
          >
            Disable
          </Button>
        )}
        {onDelete && (
          <Button
            startIcon={<DeleteIcon />}
            color="error"
            onClick={() => handleAction(onDelete)}
          >
            Delete
          </Button>
        )}
      </ButtonGroup>
    </Box>
  );
};

export default BulkActions; 