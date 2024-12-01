import { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  FileDownload as FileDownloadIcon,
  TableChart as TableChartIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';

const ExportMenu = ({ data, filename }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExport = (format) => {
    if (format === 'csv') {
      exportToCSV(data, filename);
    } else if (format === 'excel') {
      exportToExcel(data, filename);
    }
    handleClose();
  };

  return (
    <>
      <Button
        startIcon={<FileDownloadIcon />}
        onClick={handleClick}
        variant="outlined"
        size="small"
      >
        Export
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={() => handleExport('csv')}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as CSV</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('excel')}>
          <ListItemIcon>
            <TableChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as Excel</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExportMenu; 