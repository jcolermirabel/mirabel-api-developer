import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  TableChart as TableIcon,
  ViewList as ViewIcon,
  Code as ProcedureIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { getSchemaInfo } from '../../services/schemaService';
import TableDetails from './TableDetails';
import LoadingSpinner from '../common/LoadingSpinner';

const SchemaViewer = () => {
  const { serviceId } = useParams();
  const [schemaData, setSchemaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchSchemaData = useCallback(async () => {
    try {
      const data = await getSchemaInfo(serviceId);
      setSchemaData(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch schema information');
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    fetchSchemaData();
  }, [fetchSchemaData]);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value.toLowerCase());
  };

  const filterItems = (items) => {
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm)
    );
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <Typography color="error">{error}</Typography>;

  const { tables, views, procedures } = schemaData || {};

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Database Schema
      </Typography>

      <Box sx={{ display: 'flex', gap: 3 }}>
        <Paper sx={{ width: 300, height: 'calc(100vh - 200px)' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search schema..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: <SearchIcon color="action" />,
            }}
            sx={{ p: 2 }}
          />

          <Tabs
            value={currentTab}
            onChange={(_, newValue) => setCurrentTab(newValue)}
            variant="fullWidth"
          >
            <Tab label="Tables" />
            <Tab label="Views" />
            <Tab label="Procedures" />
          </Tabs>

          <List sx={{ overflow: 'auto', height: 'calc(100% - 120px)' }}>
            {currentTab === 0 && filterItems(tables).map((table) => (
              <ListItem key={table.name} disablePadding>
                <ListItemButton
                  selected={selectedItem === table.name}
                  onClick={() => setSelectedItem(table.name)}
                >
                  <ListItemIcon>
                    <TableIcon />
                  </ListItemIcon>
                  <ListItemText primary={table.name} />
                </ListItemButton>
              </ListItem>
            ))}
            {currentTab === 1 && filterItems(views).map((view) => (
              <ListItem key={view.name} disablePadding>
                <ListItemButton
                  selected={selectedItem === view.name}
                  onClick={() => setSelectedItem(view.name)}
                >
                  <ListItemIcon>
                    <ViewIcon />
                  </ListItemIcon>
                  <ListItemText primary={view.name} />
                </ListItemButton>
              </ListItem>
            ))}
            {currentTab === 2 && filterItems(procedures).map((proc) => (
              <ListItem key={proc.name} disablePadding>
                <ListItemButton
                  selected={selectedItem === proc.name}
                  onClick={() => setSelectedItem(proc.name)}
                >
                  <ListItemIcon>
                    <ProcedureIcon />
                  </ListItemIcon>
                  <ListItemText primary={proc.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>

        <Box sx={{ flexGrow: 1 }}>
          {selectedItem && (
            <TableDetails
              serviceId={serviceId}
              objectName={selectedItem}
              type={currentTab === 0 ? 'table' : currentTab === 1 ? 'view' : 'procedure'}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default SchemaViewer; 